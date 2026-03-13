import yaml
from dataclasses import dataclass, field
from typing import Optional

class PipelineParseError(Exception):
    pass


@dataclass
class Step:

    name: str
    run: str
    needs: list[str] = field(default_factory=list)
    env:  dict[str, str] = field(default_factory=dict)
    timeout: int = 60 


@dataclass
class Pipeline:

    name: str
    on:   str
    steps: list[Step]


def parse_pipeline(yaml_content: str) -> Pipeline:

    try:
        data = yaml.safe_load(yaml_content)
    except yaml.YAMLError as e:
        raise PipelineParseError(f"Invalid YAML: {e}")

    if not isinstance(data, dict):
        raise PipelineParseError("Workflow file must be a YAML dictionary")

    if "name" not in data:
        raise PipelineParseError("Missing required field: 'name'")
    if "steps" not in data:
        raise PipelineParseError("Missing required field: 'steps'")
    if not isinstance(data["steps"], list) or len(data["steps"]) == 0:
        raise PipelineParseError("'steps' must be a non-empty list")

    steps = []
    step_names = set()

    for i, raw_step in enumerate(data["steps"]):
        if not isinstance(raw_step, dict):
            raise PipelineParseError(f"Step {i+1} must be a dictionary")
        if "name" not in raw_step:
            raise PipelineParseError(f"Step {i+1} is missing required field: 'name'")
        if "run" not in raw_step:
            raise PipelineParseError(f"Step '{raw_step['name']}' is missing required field: 'run'")

        name = raw_step["name"]

        if name in step_names:
            raise PipelineParseError(f"Duplicate step name: '{name}'")
        step_names.add(name)

        needs = raw_step.get("needs", [])
        if isinstance(needs, str):
            needs = [needs] 

        steps.append(Step(
            name=name,
            run=raw_step["run"],
            needs=needs,
            env=raw_step.get("env", {}),
            timeout=raw_step.get("timeout", 60)
        ))

    for step in steps:
        for dep in step.needs:
            if dep not in step_names:
                raise PipelineParseError(
                    f"Step '{step.name}' depends on '{dep}' which doesn't exist"
                )

    return Pipeline(
        name=data.get("name", "Unnamed Pipeline"),
        on=data.get("on", "push"),
        steps=steps
    )