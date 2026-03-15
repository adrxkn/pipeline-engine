import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from backend.core.database import AsyncSessionLocal
from backend.models.run import PipelineRun

router = APIRouter()

active_connections: dict[int, list[WebSocket]] = {}


async def broadcast(run_id: int, message: str):
    """Send a log line to all clients watching this run."""
    if run_id not in active_connections:
        return
    dead = []
    for ws in active_connections[run_id]:
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)

    for ws in dead:
        active_connections[run_id].remove(ws)


@router.websocket("/ws/runs/{run_id}/logs")
async def run_logs(websocket: WebSocket, run_id: int):

    await websocket.accept()

    if run_id not in active_connections:
        active_connections[run_id] = []
    active_connections[run_id].append(websocket)

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(PipelineRun).where(PipelineRun.id == run_id)
            )
            run = result.scalar_one_or_none()
            if run and run.steps:
                for step in run.steps:
                    for line in step.get("logs", []):
                        await websocket.send_text(
                            f"[{step['name']}] {line}"
                        )

        while True:
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        pass
    finally:
        if run_id in active_connections:
            try:
                active_connections[run_id].remove(websocket)
            except ValueError:
                pass