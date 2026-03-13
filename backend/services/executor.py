import docker
import asyncio
from datetime import datetime
from typing import AsyncGenerator

from backend.services.parser import Step

client = docker.from_env()

class StepResult:
    """Holds the result of a single executed step."""
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
            await log_callback(step.name, f"▶ Starting step: {step.name}\n")

        elapsed = 0
        poll_interval = 0.5

        while elapsed < step.timeout:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            # get container state
            container_info = await asyncio.to_thread(container.reload)

            # stream any new logs
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
                    f"⏱ Step '{step.name}' timed out after {step.timeout}s\n"
                )

    except Exception as e:
        result.status = "failed"
        result.logs.append(f"Executor error: {str(e)}")
        if log_callback:
            await log_callback(step.name, f"❌ Error: {str(e)}\n")

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
                f"\n⚡ Batch {batch_index + 1}: running {batch} in parallel\n"
            )

        batch_results = await asyncio.gather(*[
            run_step(step_map[name], repo, commit_sha, log_callback)
            for name in batch
        ])

        all_results.extend(batch_results)

        if any(r.status in ("failed", "timeout") for r in batch_results):
            failed = True
            if log_callback:
                await log_callback("system", "❌ Batch failed — stopping pipeline\n")

    return all_results