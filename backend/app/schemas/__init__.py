from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import BookingStatus, UserRole


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=32)
    password: str = Field(min_length=8)
    role: UserRole = UserRole.customer


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    phone: str
    role: UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SalonBase(BaseModel):
    name: str
    address: str
    description: str = ""
    rating: float = 0
    image_url: str = ""
    opening_hours: str = "9:00 AM - 9:00 PM"
    price_range: str = "$$"
    distance_km: float = 1.5


class SalonCreate(SalonBase):
    pass


class SalonUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    description: str | None = None
    rating: float | None = None
    image_url: str | None = None
    opening_hours: str | None = None
    price_range: str | None = None
    distance_km: float | None = None


class PortfolioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str


class BarberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    salon_id: int
    name: str
    experience: int
    specialization: str
    rating: float
    profile_image: str
    portfolio: list[PortfolioRead] = []


class SalonRead(SalonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    current_queue_size: int = 0
    estimated_waiting_time: int = 0
    barbers: list[BarberRead] = []


class BarberCreate(BaseModel):
    salon_id: int
    name: str
    experience: int = 1
    specialization: str
    rating: float = 0
    profile_image: str = ""
    portfolio_images: list[str] = []


class BarberUpdate(BaseModel):
    name: str | None = None
    experience: int | None = None
    specialization: str | None = None
    rating: float | None = None
    profile_image: str | None = None
    portfolio_images: list[str] | None = None


class BookingCreate(BaseModel):
    salon_id: int
    barber_id: int


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    salon_id: int
    barber_id: int
    queue_position: int
    estimated_time: int
    otp: str
    status: BookingStatus
    created_at: datetime


class QueueItem(BaseModel):
    id: int
    customer_name: str
    barber_name: str
    queue_position: int
    estimated_time: int
    status: BookingStatus


class QueueRead(BaseModel):
    salon_id: int
    active_booking_id: int | None
    current_customer: str | None
    queue: list[QueueItem]


class BookingAction(BaseModel):
    booking_id: int


class OtpVerify(BaseModel):
    booking_id: int
    otp: str


class ReviewCreate(BaseModel):
    salon_id: int
    barber_id: int | None = None
    rating: int = Field(ge=1, le=5)
    review: str


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    salon_id: int
    barber_id: int | None
    rating: int
    review: str
    created_at: datetime
