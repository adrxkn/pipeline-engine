from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db
from backend.models.run import PipelineRun

router = APIRouter(prefix="/runs", tags=["runs"])

@router.get("/")
async def list_runs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PipelineRun).order_by(PipelineRun.created_at.desc()).limit(50)
    )
    runs = result.scalars().all()
    return [
        {
            "id": r.id,
            "repo": r.repo,
            "branch": r.branch,
            "commit_sha": r.commit_sha[:7],
            "status": r.status,
            "created_at": r.created_at,
        }
        for r in runs
    ]

@router.get("/{run_id}")
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PipelineRun).where(PipelineRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": run.id,
        "repo": run.repo,
        "branch": run.branch,
        "commit_sha": run.commit_sha,
        "status": run.status,
        "steps": run.steps,
        "created_at": run.created_at,
        "updated_at": run.updated_at,
    }