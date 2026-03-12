from sqlalchemy import Column, String, Integer, DateTime, JSON, Enum
from sqlalchemy.sql import func
import enum
from backend.core.database import Base

class RunStatus(str, enum.Enum):
    pending   = "pending"
    running   = "running"
    success   = "success"
    failed    = "failed"
    cancelled = "cancelled"

class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id         = Column(Integer, primary_key=True, index=True)
    repo       = Column(String, nullable=False)
    branch     = Column(String, nullable=False)
    commit_sha = Column(String, nullable=False)
    status     = Column(Enum(RunStatus), default=RunStatus.pending)
    steps      = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())