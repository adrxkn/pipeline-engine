import docker
import asyncio
from datetime import datetime
from typing import AsyncGenerator

from backend.services.parser import Step

client = docker.from_env()

class StepResult:
    def __init__(self, name: str):
        self.name       = name
        self.status     = "pending"   
        self.logs       = []          
        self.started_at = None
        self.ended_at   = None

    @property
    def duration(self):
        if self.started_at and self.ended_at:
            return (self.ended_at - self.started_at).total_seconds()
        return None

    def to_dict(self):
        return {
        "name":       self.name,
        "status":     self.status,
        "logs":       self.logs,
        "started_at": self.started_at.isoformat() if self.started_at else None,
        "ended_at":   self.ended_at.isoformat()   if self.ended_at   else None,
        "duration":   self.duration,
        "flaky":      self.status == "flaky"
    }


async def run_step(
    step: Step,
    repo: str,
    commit_sha: str,
    log_callback=None
) -> StepResult:

    result = StepResult(step.name)
    result.status     = "running"
    result.started_at = datetime.utcnow()

    command = f"/bin/sh -c '{step.run}'"

    environment = {**step.env}

    container = None

    try:

        container = await asyncio.to_thread(
            client.containers.run,
            image="python:3.11-slim",  
            command=command,
            environment=environment,
            detach=True,                
            mem_limit="256m",          
            nano_cpus=1_000_000_000,    
            network_mode="bridge",      
        )

        if log_callback:
            await log_callback(step.name, f"Starting step: {step.name}\n")

        elapsed = 0
        poll_interval = 0.5

        while elapsed < step.timeout:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            container_info = await asyncio.to_thread(container.reload)

            logs = await asyncio.to_thread(
                container.logs,
                stdout=True,
                stderr=True,
                tail=50         
            )
            log_text = logs.decode("utf-8", errors="replace")

            if log_text:
                for line in log_text.splitlines():
                    if line not in result.logs: 
                        result.logs.append(line)
                        if log_callback:
                            await log_callback(step.name, line + "\n")

            if container.status in ("exited", "dead"):
                exit_code = container.attrs["State"]["ExitCode"]
                result.status = "success" if exit_code == 0 else "failed"
                break
        else:
            result.status = "timeout"
            await asyncio.to_thread(container.kill)
            if log_callback:
                await log_callback(
                    step.name,
                    f"Step '{step.name}' timed out after {step.timeout}s\n"
                )

    except Exception as e:
        result.status = "failed"
        result.logs.append(f"Executor error: {str(e)}")
        if log_callback:
            await log_callback(step.name, f"Error: {str(e)}\n")

    finally:
        if container:
            try:
                await asyncio.to_thread(container.remove, force=True)
            except Exception:
                pass 

    result.ended_at = datetime.utcnow()
    return result


async def run_pipeline(
    steps: list[Step],
    batches: list[list[str]],
    repo: str,
    commit_sha: str,
    log_callback=None
) -> list[StepResult]:

    step_map = {step.name: step for step in steps}
    all_results = []
    failed = False

    for batch_index, batch in enumerate(batches):
        if failed:
            for name in batch:
                r = StepResult(name)
                r.status = "skipped"
                all_results.append(r)
            continue

        if log_callback:
            await log_callback(
                "system",
                f"\n Batch {batch_index + 1}: running {batch} in parallel\n"
            )

        batch_results = await asyncio.gather(*[
            run_step(step_map[name], repo, commit_sha, log_callback)
            for name in batch
        ])

        all_results.extend(batch_results)

        if any(r.status in ("failed", "timeout") for r in batch_results):
            failed = True
            if log_callback:
                await log_callback("system", "Batch failed — stopping pipeline\n")

    return all_results

async def run_pipeline_for_run(run_id: int, db_session_factory):
    from backend.models.run import PipelineRun, RunStatus
    from backend.services.github import fetch_workflow_file
    from backend.services.parser import parse_pipeline, PipelineParseError
    from backend.services.dag import get_execution_plan
    from backend.routers.ws import broadcast
    from sqlalchemy import select

    async with db_session_factory() as db:
        result = await db.execute(
            select(PipelineRun).where(PipelineRun.id == run_id)
        )
        run = result.scalar_one_or_none()
        if not run:
            return

        run.status = RunStatus.running
        await db.commit()

        await broadcast(run_id, f"Pipeline started for {run.repo}@{run.branch}\n")

        yaml_content = await fetch_workflow_file(run.repo, run.commit_sha)
        if not yaml_content:
            run.status = RunStatus.failed
            run.steps = [{"name": "setup", "status": "failed",
                         "logs": ["No .pipeline/workflow.yml found in repo"]}]
            await db.commit()
            await broadcast(run_id, "No .pipeline/workflow.yml found\n")
            return

        try:
            pipeline = parse_pipeline(yaml_content)
            batches  = get_execution_plan(pipeline.steps)
        except PipelineParseError as e:
            run.status = RunStatus.failed
            run.steps  = [{"name": "setup", "status": "failed", "logs": [str(e)]}]
            await db.commit()
            await broadcast(run_id, f"Pipeline parse error: {e}\n")
            return

        async def log_callback(step_name: str, line: str):
            await broadcast(run_id, f"[{step_name}] {line}")

        results = await run_pipeline(
            pipeline.steps,
            batches,
            run.repo,
            run.commit_sha,
            log_callback
        )

        run.steps = [r.to_dict() for r in results]
        overall_success = all(
            r.status in ("success", "flaky")
            for r in results
            if r.status != "skipped"
        )
        run.status = RunStatus.success if overall_success else RunStatus.failed
        await db.commit()

        emoji = "✅" if run.status == RunStatus.success else "❌"
        await broadcast(run_id, f"{emoji} Pipeline finished — {run.status}\n")
        print(f"Run #{run_id} finished — {run.status}")

async def run_step_with_retry(
    step: Step,
    repo: str,
    commit_sha: str,
    log_callback=None,
    max_retries: int = 2,
    base_delay: float = 2.0
) -> StepResult:
    attempt = 0
    last_result = None

    while attempt <= max_retries:
        if attempt > 0:
            delay = base_delay * (2 ** (attempt - 1)) 
            if log_callback:
                await log_callback(
                    step.name,
                    f"Retry {attempt}/{max_retries} — waiting {delay}s\n"
                )
            await asyncio.sleep(delay)

        if log_callback and attempt > 0:
            await log_callback(step.name, f"Retrying step: {step.name}\n")

        result = await run_step(step, repo, commit_sha, log_callback)
        last_result = result

        if result.status == "success":
            if attempt > 0:
                result.status = "flaky"
                if log_callback:
                    await log_callback(
                        step.name,
                        f"Step '{step.name}' is flaky — passed on attempt {attempt + 1}\n"
                    )
            return result

        attempt += 1

    return last_result


async def run_pipeline(
    steps: list[Step],
    batches: list[list[str]],
    repo: str,
    commit_sha: str,
    log_callback=None
) -> list[StepResult]:

    step_map = {step.name: step for step in steps}
    all_results = []
    failed = False

    for batch_index, batch in enumerate(batches):
        if failed:
            for name in batch:
                r = StepResult(name)
                r.status = "skipped"
                all_results.append(r)
            continue

        if log_callback:
            await log_callback(
                "system",
                f"\n Batch {batch_index + 1}: running {batch} in parallel\n"
            )

        batch_results = await asyncio.gather(*[
            run_step_with_retry(
                step_map[name],
                repo,
                commit_sha,
                log_callback,
                max_retries=2,
                base_delay=2.0
            )
            for name in batch
        ])

        all_results.extend(batch_results)

        if any(r.status in ("failed", "timeout") for r in batch_results):
            failed = True
            if log_callback:
                await log_callback("system", "Batch failed — stopping pipeline\n")

    return all_results