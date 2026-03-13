from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from backend.core.database import init_db
from backend.routers import webhook, runs
from backend.services.parser import parse_pipeline, PipelineParseError
from backend.services.dag import get_execution_plan

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("✅ Database initialized")
    yield
    print("👋 Shutting down")

app = FastAPI(
    title="Pipeline Engine",
    description="Self-hosted CI pipeline engine with DAG-based step execution",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(PipelineParseError)
async def parse_error_handler(request: Request, exc: PipelineParseError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})

app.include_router(webhook.router)
app.include_router(runs.router)

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "0.1.0"}

@app.post("/test-parse")
async def test_parse(payload: dict):
    yaml_content = payload.get("yaml", "")
    pipeline = parse_pipeline(yaml_content)
    batches = get_execution_plan(pipeline.steps)
    return {
        "pipeline": pipeline.name,
        "steps": [s.name for s in pipeline.steps],
        "execution_batches": batches
    }