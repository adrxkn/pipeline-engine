import httpx
import base64

async def fetch_workflow_file(repo: str, commit_sha: str) -> str | None:

    url = f"https://api.github.com/repos/{repo}/contents/.pipeline/workflow.yml"
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    params = {"ref": commit_sha}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)
        
        if response.status_code == 404:
            print(f"No workflow file found in {repo}")
            return None
        
        if response.status_code != 200:
            print(f"GitHub API error: {response.status_code}")
            return None

        data = response.json()
        
        content_b64 = data.get("content", "")
        content = base64.b64decode(content_b64).decode("utf-8")
        
        return content