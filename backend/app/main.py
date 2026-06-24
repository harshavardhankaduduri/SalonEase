from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, barbers, bookings, reviews, salons, ws
from app.core.config import get_settings
from app.core.database import Base, engine

settings = get_settings()

app = FastAPI(title="SalonEase API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(salons.router)
app.include_router(barbers.router)
app.include_router(bookings.router)
app.include_router(reviews.router)
app.include_router(ws.router)
