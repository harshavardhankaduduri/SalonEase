from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_owner
from app.core.database import get_db
from app.models import Barber, BarberPortfolio, Salon, User
from app.schemas import BarberCreate, BarberRead, BarberUpdate

router = APIRouter(prefix="/barbers", tags=["Barbers"])


def assert_salon_owner(db: Session, salon_id: int, owner: User) -> Salon:
    salon = db.get(Salon, salon_id)
    if not salon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    if salon.owner_id != owner.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your salon")
    return salon


@router.get("", response_model=list[BarberRead])
def list_barbers(salon_id: int | None = None, db: Session = Depends(get_db)) -> list[BarberRead]:
    stmt = select(Barber).options(joinedload(Barber.portfolio))
    if salon_id:
        stmt = stmt.where(Barber.salon_id == salon_id)
    return list(db.scalars(stmt.order_by(Barber.rating.desc(), Barber.name.asc())).unique().all())


@router.post("", response_model=BarberRead, status_code=status.HTTP_201_CREATED)
def create_barber(payload: BarberCreate, owner: User = Depends(require_owner), db: Session = Depends(get_db)) -> BarberRead:
    assert_salon_owner(db, payload.salon_id, owner)
    data = payload.model_dump(exclude={"portfolio_images"})
    barber = Barber(**data)
    barber.portfolio = [BarberPortfolio(image_url=image) for image in payload.portfolio_images]
    db.add(barber)
    db.commit()
    db.refresh(barber)
    return barber


@router.put("/{barber_id}", response_model=BarberRead)
def update_barber(
    barber_id: int, payload: BarberUpdate, owner: User = Depends(require_owner), db: Session = Depends(get_db)
) -> BarberRead:
    barber = db.scalar(select(Barber).options(joinedload(Barber.portfolio)).where(Barber.id == barber_id))
    if not barber:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found")
    assert_salon_owner(db, barber.salon_id, owner)
    data = payload.model_dump(exclude_unset=True, exclude={"portfolio_images"})
    for key, value in data.items():
        setattr(barber, key, value)
    if payload.portfolio_images is not None:
        barber.portfolio = [BarberPortfolio(image_url=image) for image in payload.portfolio_images]
    db.commit()
    db.refresh(barber)
    return barber


@router.delete("/{barber_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_barber(barber_id: int, owner: User = Depends(require_owner), db: Session = Depends(get_db)) -> None:
    barber = db.get(Barber, barber_id)
    if not barber:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found")
    assert_salon_owner(db, barber.salon_id, owner)
    db.delete(barber)
    db.commit()
