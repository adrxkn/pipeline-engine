from collections import defaultdict, deque
from backend.services.parser import Step, PipelineParseError


def build_dag(steps: list[Step]) -> dict[str, list[str]]:

    graph = defaultdict(list)
    for step in steps:
        for dep in step.needs:
            graph[dep].append(step.name)

        if step.name not in graph:
            graph[step.name] = []
    return dict(graph)


def topological_sort(steps: list[Step]) -> list[list[str]]:

    in_degree = {step.name: len(step.needs) for step in steps}

    dependents = defaultdict(list)
    for step in steps:
        for dep in step.needs:
            dependents[dep].append(step.name)

    queue = deque([name for name, degree in in_degree.items() if degree == 0])
    batches = []
    processed = 0

    while queue:

        current_batch = list(queue)
        queue.clear()
        batches.append(current_batch)
        processed += len(current_batch)

        for name in current_batch:
            for dependent in dependents[name]:
                in_degree[dependent] -= 1

                if in_degree[dependent] == 0:
                    queue.append(dependent)

    if processed != len(steps):
        raise PipelineParseError(
            "Circular dependency detected in pipeline steps"
        )

    return batches


def get_execution_plan(steps: list[Step]) -> list[list[str]]:

    return topological_sort(steps)