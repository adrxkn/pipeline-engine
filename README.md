# Pipeline Engine

A self-hosted CI pipeline engine that automatically runs your test suite,
linter, or build process every time you push code to GitHub — no third-party
infrastructure required. You own the execution environment completely.

Built as a lightweight alternative to GitHub Actions for developers who want
full visibility into what's happening under the hood, or for teams that can't
let source code touch external servers for compliance reasons.

## Key Features

- **Webhook-driven triggers** — connects to any GitHub repository via webhook,
  verifies every request with HMAC-SHA256 signature validation, and triggers
  a pipeline run automatically on every push

- **DAG-based parallel execution** — pipeline steps declare dependencies on
  each other using a `needs` field; independent steps run concurrently using
  Kahn's topological sort algorithm, reducing total pipeline time compared to
  sequential execution

- **Isolated Docker containers** — every step runs in a fresh container with
  CPU and memory caps, so a failing step can't corrupt the environment of the
  next one and results are consistent across every run

- **Real-time log streaming** — container output is piped directly to the
  dashboard over WebSockets as steps execute, giving you live feedback without
  polling

- **Retry with exponential backoff** — failed steps are automatically retried
  with increasing wait times between attempts; steps that fail then pass are
  flagged as flaky rather than failed

- **Full run history** — every run's steps, logs, duration, and status are
  persisted to the database and accessible from the dashboard at any time

- **Self-hosted** — runs on your own machine locally via ngrok for development,
  or on any VPS for production use with a single `docker compose up` command

### Demo

For the demo, I created a pipeline-test repo on Github, added a README file which would be modified and pushed onto the main branch to trigger the webhook connected to the repository.

We also create the workflow.yaml file which the backend will parse and test. Below is the workflow.yaml in the pipeline-test repo:
```yaml
name: First pipeline
on: push

steps:
  - name: greet
    run: echo "Hello from the pipeline"

  - name: python-version
    run: python --version
    needs: [greet]
```
Once we commit and push any change to the repo (main), the github webhook will be fired and received by the ngrok url, which will then forward the webhook to the pipeline engine running on localhost. <br> 

The engine fetches `.pipeline/workflow.yml` from commit `9efb83e`, The DAG resolver determines that `python-version` depends on `greet` so `greet` will run first, then `python-version` after the firste step is completed. <br>

Both of the steps are executed in isolated docker containers

<img width="1919" height="1111" alt="image" src="https://github.com/user-attachments/assets/7268f69c-b935-43e6-b014-31c82bfcb3e1" />
<br>

The screenshot above shows the complete pipeline run triggered by the `git push` to the connected repository. <br>

Pipeline Output correctly shows the full terminal output streamed live over WebSockets, showing exactly what ran inside each container.

In a real project these workflow-yaml steps would be your actual test suite, linter, type checker, or build process — anything that can run as a shell command. The engine doesn't care what the commands do, it just executes them, captures the output, and tells you whether they passed or failed. <br>

Example of what an actual workflow's workflow.yaml should look like:

```yaml
name: Run Tests
on: push
 
steps:
  - name: install-deps
    run: pip install -r requirements.txt
 
  - name: run-tests
    run: pytest
    needs: [install-deps]
 
  - name: lint
    run: flake8 .
    needs: [install-deps]
 
  - name: build
    run: python build.py
    needs: [run-tests, lint]
```
 



## How to install
### Prerequisites
 
- Python 3.11+
- Docker Desktop (must be running before you start the backend)
- Node.js 18+
- ngrok (only needed for local development so GitHub can reach your machine)
 
### 1. Clone and install
 
```bash
git clone https://github.com/yourname/pipeline-engine.git
cd pipeline-engine
 
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
 
pip install -r requirements.txt
```
 
### 2. Configure environment
 
```bash
cp .env.example .env
```
 
Edit `.env`:
 
```env
DATABASE_URL=sqlite+aiosqlite:///./pipeline.db
SECRET_KEY=your-secret-key-here
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
```
 
> The webhook secret can be any string — you'll use the same value in GitHub's webhook settings.
 
### 3. Run the backend
 
```bash
uvicorn backend.main:app --reload
```
 
API available at `http://127.0.0.1:8000`  
Interactive docs at `http://127.0.0.1:8000/docs`
 
### 4. Run the frontend
 
```bash
cd frontend
npm install
npm run dev
```
 
Dashboard available at `http://localhost:5173`
 
### 5. Expose your local server
GitHub needs a public URL to send webhook events to. ngrok creates a temporary tunnel from a public URL to your local server:
```bash
ngrok http 8000
```
 
Copy the ngrok URL (e.g. `https://abc123.ngrok.io`).
 
### 6. Connect a GitHub repo
 
1. Create a repo on GitHub (or use an existing one)
2. Add the `.pipeline/workflow.yml` file which will have your actual tests (in the repo root)
3. Go to **Settings → Webhooks → Add webhook**:
   - **Payload URL**: `https://abc123.ngrok.io/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events**: Just the push event
4. Click **Add webhook** — GitHub will send a ping event to verify the connection
5. Push any change to the repo and watch the dashboard — your pipeline run should appear within a few seconds

 

# Pipeline Engine

A self-hosted CI pipeline engine that automatically runs your test suite,
linter, or build process every time you push code to GitHub — no third-party
infrastructure required. You own the execution environment completely.

Built as a lightweight alternative to GitHub Actions for developers who want
full visibility into what's happening under the hood, or for teams that can't
let source code touch external servers for compliance reasons.

## Key Features

- **Webhook-driven triggers** — connects to any GitHub repository via webhook,
  verifies every request with HMAC-SHA256 signature validation, and triggers
  a pipeline run automatically on every push

- **DAG-based parallel execution** — pipeline steps declare dependencies on
  each other using a `needs` field; independent steps run concurrently using
  Kahn's topological sort algorithm, reducing total pipeline time compared to
  sequential execution

- **Isolated Docker containers** — every step runs in a fresh container with
  CPU and memory caps, so a failing step can't corrupt the environment of the
  next one and results are consistent across every run

- **Real-time log streaming** — container output is piped directly to the
  dashboard over WebSockets as steps execute, giving you live feedback without
  polling

- **Retry with exponential backoff** — failed steps are automatically retried
  with increasing wait times between attempts; steps that fail then pass are
  flagged as flaky rather than failed

- **Full run history** — every run's steps, logs, duration, and status are
  persisted to the database and accessible from the dashboard at any time

- **Self-hosted** — runs on your own machine locally via ngrok for development,
  or on any VPS for production use with a single `docker compose up` command

### Demo

For the demo, I created a pipeline-test repo on Github, added a README file which would be modified and pushed onto the main branch to trigger the webhook connected to the repository.

We also create the workflow.yaml file which the backend will parse and test. Below is the workflow.yaml in the pipeline-test repo:
```yaml
name: First pipeline
on: push

steps:
  - name: greet
    run: echo "Hello from the pipeline"

  - name: python-version
    run: python --version
    needs: [greet]
```
Once we commit and push any change to the repo (main), the github webhook will be fired and received by the ngrok url, which will then forward the webhook to the pipeline engine running on localhost. <br> 

The engine fetches `.pipeline/workflow.yml` from commit `9efb83e`, The DAG resolver determines that `python-version` depends on `greet` so `greet` will run first, then `python-version` after the firste step is completed. <br>

Both of the steps are executed in isolated docker containers

<img width="1919" height="1111" alt="image" src="https://github.com/user-attachments/assets/7268f69c-b935-43e6-b014-31c82bfcb3e1" />
<br>

The screenshot above shows the complete pipeline run triggered by the `git push` to the connected repository. <br>

Pipeline Output correctly shows the full terminal output streamed live over WebSockets, showing exactly what ran inside each container.

In a real project these workflow-yaml steps would be your actual test suite, linter, type checker, or build process — anything that can run as a shell command. The engine doesn't care what the commands do, it just executes them, captures the output, and tells you whether they passed or failed. <br>

Example of what an actual workflow's workflow.yaml should look like:

```yaml
name: Run Tests
on: push
 
steps:
  - name: install-deps
    run: pip install -r requirements.txt
 
  - name: run-tests
    run: pytest
    needs: [install-deps]
 
  - name: lint
    run: flake8 .
    needs: [install-deps]
 
  - name: build
    run: python build.py
    needs: [run-tests, lint]
```
 



## How to install
### Prerequisites
 
- Python 3.11+
- Docker Desktop (must be running before you start the backend)
- Node.js 18+
- ngrok (only needed for local development so GitHub can reach your machine)
 
### 1. Clone and install
 
```bash
git clone https://github.com/yourname/pipeline-engine.git
cd pipeline-engine
 
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
 
pip install -r requirements.txt
```
 
### 2. Configure environment
 
```bash
cp .env.example .env
```
 
Edit `.env`:
 
```env
DATABASE_URL=sqlite+aiosqlite:///./pipeline.db
SECRET_KEY=your-secret-key-here
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
```
 
> The webhook secret can be any string — you'll use the same value in GitHub's webhook settings.
 
### 3. Run the backend
 
```bash
uvicorn backend.main:app --reload
```
 
API available at `http://127.0.0.1:8000`  
Interactive docs at `http://127.0.0.1:8000/docs`
 
### 4. Run the frontend
 
```bash
cd frontend
npm install
npm run dev
```
 
Dashboard available at `http://localhost:5173`
 
### 5. Expose your local server
GitHub needs a public URL to send webhook events to. ngrok creates a temporary tunnel from a public URL to your local server:
```bash
ngrok http 8000
```
 
Copy the ngrok URL (e.g. `https://abc123.ngrok.io`).
 
### 6. Connect a GitHub repo
 
1. Create a repo on GitHub (or use an existing one)
2. Add the `.pipeline/workflow.yml` file which will have your actual tests (in the repo root)
3. Go to **Settings → Webhooks → Add webhook**:
   - **Payload URL**: `https://abc123.ngrok.io/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events**: Just the push event
4. Click **Add webhook** — GitHub will send a ping event to verify the connection
5. Push any change to the repo and watch the dashboard — your pipeline run should appear within a few seconds

 
