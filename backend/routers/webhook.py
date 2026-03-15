import hmac
import hashlib
import json
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db, AsyncSessionLocal
from backend.core.config import settings
from backend.models.run import PipelineRun, RunStatus
from backend.services.executor import run_pipeline_for_run

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

def verify_github_signature(payload_bytes: bytes, signature_header: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected_sig = signature_header[7:]
    actual_sig = hmac.new(
        key=settings.github_webhook_secret.encode(),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_sig, actual_sig)


@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    payload_bytes = await request.body()

    signature = request.headers.get("X-Hub-Signature-256", "")
    if not verify_github_signature(payload_bytes, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event_type = request.headers.get("X-GitHub-Event", "")
    if event_type != "push":
        return {"message": f"Ignoring event type: {event_type}"}

    payload = json.loads(payload_bytes)
    repo     = payload.get("repository", {}).get("full_name", "")
    branch   = payload.get("ref", "").replace("refs/heads/", "")
    commit   = payload.get("after", "")

    if not repo or not commit:
        raise HTTPException(status_code=400, detail="Missing repo or commit info")

    run = PipelineRun(
        repo=repo,
        branch=branch,
        commit_sha=commit,
        status=RunStatus.pending,
        steps=[]
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    print(f"New run #{run.id} triggered — {repo}@{branch} ({commit[:7]})")

    background_tasks.add_task(
        run_pipeline_for_run,
        run.id,
        AsyncSessionLocal
    )

    return {
        "message": "Pipeline run created and queued",
        "run_id": run.id,
        "repo": repo,
        "branch": branch,
        "commit": commit[:7]
    }