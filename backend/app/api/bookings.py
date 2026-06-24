from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_customer, require_owner
from app.core.database import get_db
from app.models import Booking, BookingStatus, Salon, User
from app.schemas import BookingAction, BookingCreate, BookingRead, OtpVerify, QueueRead
from app.services.queue import (
    AVERAGE_SERVICE_MINUTES,
    barber_belongs_to_salon,
    complete_booking,
    make_otp,
    manager,
    next_queue_position,
    normalize_queue,
    queue_snapshot,
    skip_booking,
)

router = APIRouter(tags=["Bookings"])


@router.post("/bookings", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate, customer: User = Depends(require_customer), db: Session = Depends(get_db)
) -> BookingRead:
    salon = db.get(Salon, payload.salon_id)
    if not salon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    if not barber_belongs_to_salon(db, payload.salon_id, payload.barber_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Barber does not belong to salon")
    position = next_queue_position(db, payload.salon_id, payload.barber_id)
    booking = Booking(
        user_id=customer.id,
        salon_id=payload.salon_id,
        barber_id=payload.barber_id,
        queue_position=position,
        estimated_time=position * AVERAGE_SERVICE_MINUTES,
        otp=make_otp(),
        status=BookingStatus.waiting,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    await manager.broadcast(payload.salon_id, queue_snapshot(db, payload.salon_id).model_dump(mode="json"))
    return booking


@router.get("/bookings/{booking_id}", response_model=BookingRead)
def get_booking(booking_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> BookingRead:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if user.role.value == "customer" and booking.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own booking")
    return booking


@router.get("/queue/{salon_id}", response_model=QueueRead)
def get_queue(salon_id: int, db: Session = Depends(get_db)) -> QueueRead:
    if not db.get(Salon, salon_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return queue_snapshot(db, salon_id)


def owned_booking(db: Session, owner: User, booking_id: int) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    salon = db.get(Salon, booking.salon_id)
    if not salon or salon.owner_id != owner.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your salon queue")
    return booking


@router.put("/booking/complete", response_model=BookingRead)
async def mark_complete(
    payload: BookingAction, owner: User = Depends(require_owner), db: Session = Depends(get_db)
) -> BookingRead:
    booking = owned_booking(db, owner, payload.booking_id)
    if booking.status != BookingStatus.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verify the customer's OTP before completing the haircut",
        )
    complete_booking(db, booking)
    db.commit()
    db.refresh(booking)
    await manager.broadcast(booking.salon_id, queue_snapshot(db, booking.salon_id).model_dump(mode="json"))
    return booking


@router.put("/booking/skip", response_model=BookingRead)
async def mark_skipped(
    payload: BookingAction, owner: User = Depends(require_owner), db: Session = Depends(get_db)
) -> BookingRead:
    booking = owned_booking(db, owner, payload.booking_id)
    if booking.status not in [BookingStatus.waiting, BookingStatus.active]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only waiting or active bookings can be skipped")
    skip_booking(db, booking)
    db.commit()
    db.refresh(booking)
    await manager.broadcast(booking.salon_id, queue_snapshot(db, booking.salon_id).model_dump(mode="json"))
    return booking


@router.put("/booking/next", response_model=BookingRead)
async def next_customer(
    payload: BookingAction, owner: User = Depends(require_owner), db: Session = Depends(get_db)
) -> BookingRead:
    booking = owned_booking(db, owner, payload.booking_id)
    if booking.status != BookingStatus.waiting:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only waiting bookings can be called next")
    await manager.broadcast(booking.salon_id, queue_snapshot(db, booking.salon_id).model_dump(mode="json"))
    return booking


@router.post("/verify-otp", response_model=BookingRead)
async def verify_otp(payload: OtpVerify, owner: User = Depends(require_owner), db: Session = Depends(get_db)) -> BookingRead:
    booking = owned_booking(db, owner, payload.booking_id)
    if booking.otp != payload.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
    booking.status = BookingStatus.active
    booking.queue_position = 0
    normalize_queue(db, booking.salon_id)
    db.commit()
    db.refresh(booking)
    await manager.broadcast(booking.salon_id, queue_snapshot(db, booking.salon_id).model_dump(mode="json"))
    return booking


@router.get("/booking-history", response_model=list[BookingRead])
def booking_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[BookingRead]:
    stmt = select(Booking).order_by(Booking.created_at.desc())
    if user.role.value == "customer":
        stmt = stmt.where(Booking.user_id == user.id)
    return list(db.scalars(stmt).all())
