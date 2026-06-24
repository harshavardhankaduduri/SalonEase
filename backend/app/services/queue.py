from datetime import UTC, datetime
from random import randint

from fastapi import WebSocket
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Barber, Booking, BookingStatus
from app.schemas import QueueItem, QueueRead


AVERAGE_SERVICE_MINUTES = 10


class QueueConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, salon_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(salon_id, []).append(websocket)

    def disconnect(self, salon_id: int, websocket: WebSocket) -> None:
        connections = self.active_connections.get(salon_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections and salon_id in self.active_connections:
            del self.active_connections[salon_id]

    async def broadcast(self, salon_id: int, payload: dict) -> None:
        for websocket in list(self.active_connections.get(salon_id, [])):
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(salon_id, websocket)


manager = QueueConnectionManager()


def next_queue_position(db: Session, salon_id: int, barber_id: int) -> int:
    count = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.salon_id == salon_id,
            Booking.status.in_([BookingStatus.waiting, BookingStatus.active]),
        )
    )
    return int(count or 0) + 1


def make_otp() -> str:
    return str(randint(100000, 999999))


def normalize_queue(db: Session, salon_id: int) -> None:
    bookings = db.scalars(
        select(Booking)
        .where(Booking.salon_id == salon_id, Booking.status == BookingStatus.waiting)
        .order_by(Booking.created_at.asc(), Booking.id.asc())
    ).all()
    for index, booking in enumerate(bookings, start=1):
        booking.queue_position = index
        booking.estimated_time = index * AVERAGE_SERVICE_MINUTES


def queue_snapshot(db: Session, salon_id: int) -> QueueRead:
    bookings = db.scalars(
        select(Booking)
        .options(joinedload(Booking.user), joinedload(Booking.barber))
        .where(Booking.salon_id == salon_id, Booking.status.in_([BookingStatus.active, BookingStatus.waiting]))
        .order_by(Booking.status.asc(), Booking.queue_position.asc(), Booking.created_at.asc())
    ).unique().all()
    active = next((booking for booking in bookings if booking.status == BookingStatus.active), None)
    return QueueRead(
        salon_id=salon_id,
        active_booking_id=active.id if active else None,
        current_customer=active.user.name if active else None,
        queue=[
            QueueItem(
                id=booking.id,
                customer_name=booking.user.name,
                barber_name=booking.barber.name,
                queue_position=booking.queue_position,
                estimated_time=booking.estimated_time,
                status=booking.status,
            )
            for booking in bookings
        ],
    )


def complete_booking(db: Session, booking: Booking) -> Booking:
    booking.status = BookingStatus.completed
    booking.completed_at = datetime.now(UTC)
    db.flush()
    normalize_queue(db, booking.salon_id)
    return booking


def skip_booking(db: Session, booking: Booking) -> Booking:
    booking.status = BookingStatus.skipped
    db.flush()
    normalize_queue(db, booking.salon_id)
    return booking


def barber_belongs_to_salon(db: Session, salon_id: int, barber_id: int) -> bool:
    barber = db.get(Barber, barber_id)
    return bool(barber and barber.salon_id == salon_id)
