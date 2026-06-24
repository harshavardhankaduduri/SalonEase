from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(StrEnum):
    customer = "customer"
    owner = "owner"


class BookingStatus(StrEnum):
    waiting = "waiting"
    active = "active"
    completed = "completed"
    skipped = "skipped"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.customer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    salons: Mapped[list["Salon"]] = relationship(back_populates="owner")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="user")


class Salon(Base):
    __tablename__ = "salons"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(160), index=True)
    address: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    rating: Mapped[float] = mapped_column(Float, default=0)
    image_url: Mapped[str] = mapped_column(String(500), default="")
    opening_hours: Mapped[str] = mapped_column(String(160), default="9:00 AM - 9:00 PM")
    price_range: Mapped[str] = mapped_column(String(40), default="$$")
    distance_km: Mapped[float] = mapped_column(Float, default=1.5)

    owner: Mapped[User] = relationship(back_populates="salons")
    barbers: Mapped[list["Barber"]] = relationship(back_populates="salon", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="salon")
    reviews: Mapped[list["Review"]] = relationship(back_populates="salon")


class Barber(Base):
    __tablename__ = "barbers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    salon_id: Mapped[int] = mapped_column(ForeignKey("salons.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    experience: Mapped[int] = mapped_column(Integer, default=1)
    specialization: Mapped[str] = mapped_column(String(160))
    rating: Mapped[float] = mapped_column(Float, default=0)
    profile_image: Mapped[str] = mapped_column(String(500), default="")

    salon: Mapped[Salon] = relationship(back_populates="barbers")
    portfolio: Mapped[list["BarberPortfolio"]] = relationship(back_populates="barber", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="barber")


class BarberPortfolio(Base):
    __tablename__ = "barber_portfolio"

    id: Mapped[int] = mapped_column(primary_key=True)
    barber_id: Mapped[int] = mapped_column(ForeignKey("barbers.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(String(500))

    barber: Mapped[Barber] = relationship(back_populates="portfolio")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    salon_id: Mapped[int] = mapped_column(ForeignKey("salons.id", ondelete="CASCADE"), index=True)
    barber_id: Mapped[int] = mapped_column(ForeignKey("barbers.id", ondelete="CASCADE"), index=True)
    queue_position: Mapped[int] = mapped_column(Integer)
    estimated_time: Mapped[int] = mapped_column(Integer)
    otp: Mapped[str] = mapped_column(String(8))
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.waiting, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="bookings")
    salon: Mapped[Salon] = relationship(back_populates="bookings")
    barber: Mapped[Barber] = relationship(back_populates="bookings")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    salon_id: Mapped[int] = mapped_column(ForeignKey("salons.id", ondelete="CASCADE"), index=True)
    barber_id: Mapped[int | None] = mapped_column(ForeignKey("barbers.id", ondelete="SET NULL"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer)
    review: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    salon: Mapped[Salon] = relationship(back_populates="reviews")
