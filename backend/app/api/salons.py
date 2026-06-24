from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_owner
from app.core.database import get_db
from app.models import Barber, Booking, BookingStatus, Salon, User
from app.schemas import SalonCreate, SalonRead, SalonUpdate

router = APIRouter(prefix="/salons", tags=["Salons"])


def enrich_salon(db: Session, salon: Salon) -> SalonRead:
    queue_size = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.salon_id == salon.id,
            Booking.status.in_([BookingStatus.waiting, BookingStatus.active]),
        )
    )
    data = SalonRead.model_validate(salon)
    data.current_queue_size = int(queue_size or 0)
    data.estimated_waiting_time = data.current_queue_size * 10
    return data


@router.get("", response_model=list[SalonRead])
def list_salons(
    search: str | None = None,
    min_rating: float | None = Query(default=None, ge=0, le=5),
    max_distance: float | None = Query(default=None, ge=0),
    price_range: str | None = None,
    db: Session = Depends(get_db),
) -> list[SalonRead]:
    stmt = select(Salon).options(joinedload(Salon.barbers).joinedload(Barber.portfolio))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Salon.name.ilike(like), Salon.address.ilike(like), Salon.description.ilike(like)))
    if min_rating is not None:
        stmt = stmt.where(Salon.rating >= min_rating)
    if max_distance is not None:
        stmt = stmt.where(Salon.distance_km <= max_distance)
    if price_range:
        stmt = stmt.where(Salon.price_range == price_range)
    salons = db.scalars(stmt.order_by(Salon.rating.desc(), Salon.name.asc())).unique().all()
    return [enrich_salon(db, salon) for salon in salons]


@router.get("/{salon_id}", response_model=SalonRead)
def get_salon(salon_id: int, db: Session = Depends(get_db)) -> SalonRead:
    salon = db.scalar(
        select(Salon).options(joinedload(Salon.barbers).joinedload(Barber.portfolio)).where(Salon.id == salon_id)
    )
    if not salon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    return enrich_salon(db, salon)


@router.post("", response_model=SalonRead, status_code=status.HTTP_201_CREATED)
def create_salon(payload: SalonCreate, owner: User = Depends(require_owner), db: Session = Depends(get_db)) -> SalonRead:
    salon = Salon(owner_id=owner.id, **payload.model_dump())
    db.add(salon)
    db.commit()
    db.refresh(salon)
    return enrich_salon(db, salon)


@router.put("/{salon_id}", response_model=SalonRead)
def update_salon(
    salon_id: int, payload: SalonUpdate, owner: User = Depends(require_owner), db: Session = Depends(get_db)
) -> SalonRead:
    salon = db.get(Salon, salon_id)
    if not salon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    if salon.owner_id != owner.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your salon")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(salon, key, value)
    db.commit()
    db.refresh(salon)
    return enrich_salon(db, salon)


@router.delete("/{salon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salon(salon_id: int, owner: User = Depends(require_owner), db: Session = Depends(get_db)) -> None:
    salon = db.get(Salon, salon_id)
    if not salon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    if salon.owner_id != owner.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your salon")
    db.delete(salon)
    db.commit()
