**for backend**
open terminal and then write the following below:-

cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

**for frontend**
open new terminal by clicking + then type 
cd frontend
npm cache clean --force
npm ci
npm install
npm run dev