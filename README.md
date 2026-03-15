### Prerequisites
 
- Python 3.11+
- Docker Desktop
- Node.js 18+
- ngrok (for local webhook testing)
 
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
 
```bash
ngrok http 8000
```
 
Copy the ngrok URL (e.g. `https://abc123.ngrok.io`).
 
### 6. Connect a GitHub repo
 
1. Create a repo on GitHub (or use an existing one)
2. Add a `.pipeline/workflow.yml` file (see [Writing Pipelines](#writing-pipelines))
3. Go to **Settings → Webhooks → Add webhook**:
   - **Payload URL**: `https://abc123.ngrok.io/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events**: Just the push event
4. Push to the repo — your pipeline will trigger automatically

## Writing Pipelines
 
Create a `.pipeline/workflow.yml` file in the root of any connected repo:
 
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
 
 
