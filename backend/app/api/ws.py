from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.database import SessionLocal
from app.services.queue import manager, queue_snapshot

router = APIRouter(tags=["Realtime"])


@router.websocket("/ws/queue/{salon_id}")
async def queue_websocket(websocket: WebSocket, salon_id: int) -> None:
    await manager.connect(salon_id, websocket)
    db = SessionLocal()
    try:
        await websocket.send_json(queue_snapshot(db, salon_id).model_dump(mode="json"))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(salon_id, websocket)
    finally:
        db.close()
