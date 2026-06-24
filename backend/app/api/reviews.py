from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_customer
from app.core.database import get_db
from app.models import Review, Salon, User
from app.schemas import ReviewCreate, ReviewRead

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def create_review(payload: ReviewCreate, customer: User = Depends(require_customer), db: Session = Depends(get_db)) -> ReviewRead:
    if not db.get(Salon, payload.salon_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salon not found")
    review = Review(user_id=customer.id, **payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/{salon_id}", response_model=list[ReviewRead])
def list_reviews(salon_id: int, db: Session = Depends(get_db)) -> list[ReviewRead]:
    return list(db.scalars(select(Review).where(Review.salon_id == salon_id).order_by(Review.created_at.desc())).all())
