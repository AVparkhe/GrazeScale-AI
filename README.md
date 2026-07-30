# GrazeScale AI 🌾 — Livestock Biometrics & Intelligence Suite
**Developed by [AVparkhe](https://github.com/AVparkhe)**

GrazeScale AI is a state-of-the-art, non-invasive livestock identification and productivity management platform. Powered by deep learning and computer vision, it automates epidermal muzzle pattern recognition for secure animal identification and computes morphometric live-weight estimations from standard photographic images.

---

## ✨ Highlights & Capabilities

- **🐮 Epidermal Muzzle Recognition:** Implements AI feature extraction (SIFT & neural embeddings) to cross-reference unique cattle nose prints with high confidence without resorting to branding or invasive ear tags.
- **⚖️ AI Live-Weight Estimation:** Analyzes side and rear profile imagery to calculate heart girth and body length ratios, delivering real-time live-weight estimates with predictive accuracy metrics.
- **📊 Herd Productivity Dashboard:** Comprehensive tracking of immunization timelines, booster schedules, historical weight curves, and daily milk yield production output.
- **🎙️ Integrated Voice Memo:** Responsive field assistant for instant audio notation and livestock observational reporting.
- **☁️ Cloud-Ready Enterprise Architecture:** Modular full-stack design cleanly segmented into a performant **React** client and a CPU-optimized **FastAPI + PostgreSQL** inference backend.

---

## 🛠️ Technology Stack & Architecture

| Component | Stack Specification | Targeted Cloud Host |
| :--- | :--- | :--- |
| **Frontend Application** | React 18, Framer Motion, Tailwind CSS, Lucide Icons, Vite/CRA | **Vercel** |
| **AI Inference Backend** | Python 3.10+, FastAPI, Uvicorn, PyTorch (CPU Edition), OpenCV, Scikit-Learn | **Render (Web Service)** |
| **Database Engine** | PostgreSQL, Psycopg2 (RealDictCursor) | **Render PostgreSQL / Supabase** |

---

## 📂 Repository Layout

```
GrazeScale-AI/
├── backend/                  # FastAPI & AI/ML Inference Engine
│   ├── app.py                # REST endpoints, database pool & CORS configuration
│   ├── requirements.txt      # Optimized CPU lightweight requirements
│   ├── muzzle_recognition_model.pkl  # Trained feature classification model
│   └── .env.example          # Backend environment variable template
├── frontend/                 # React Web Application & Intelligence Suite
│   ├── src/
│   │   ├── App.jsx           # Application routing, navigation & cattle registry views
│   │   └── components/
│   │       ├── GrazeScaleDashboard.jsx  # Advanced AI analytics & estimation interface
│   │       └── UploadForm.jsx           # Biometric upload helpers
│   ├── package.json          # Frontend manifest and dependency declarations
│   └── vercel.json           # Single Page Application (SPA) URL routing rewrites
└── README.md                 # Project architecture documentation & hosting guide
```

---

## 🚀 Local Development Setup

### 1. Backend Setup (`/backend`)
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```
Copy `.env.example` to `.env` and configure your local PostgreSQL database parameters:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup (`/frontend`)
```bash
cd frontend
npm install
```
Copy `.env.example` to `.env` and ensure `REACT_APP_API_URL` points to `http://localhost:8000`:
```bash
npm start
```
Open your browser to `http://localhost:3000` to interact with the GrazeScale AI suite.

---

## 🌐 Production Cloud Deployment (Vercel + Render)

### Deploying the Backend on Render
1. Create a new **Web Service** on [Render](https://render.com) connected to your repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to: `pip install -r requirements.txt`
4. Set **Start Command** to: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, provide your Render PostgreSQL connection string as `DATABASE_URL` and specify your deployed Vercel domain in `CORS_ALLOWED_ORIGINS`.
6. Deploy the web service. Note: Lightweight CPU-only PyTorch wheels are configured automatically in `requirements.txt` to ensure fast builds within memory limits.

### Deploying the Frontend on Vercel
1. Import this project into [Vercel](https://vercel.com) and set the **Root Directory** to `frontend`.
2. Vercel automatically detects the React setup and loads the bundled `vercel.json` configuration for SPA routing rewrites.
3. In **Environment Variables**, add `REACT_APP_API_URL` set to your live Render API URL (e.g., `https://grazescale-api.onrender.com`).
4. Deploy to generate your high-performance production frontend URL.

---

## 📄 License & Author
Developed and maintained by [AVparkhe](https://github.com/AVparkhe).
All rights reserved.
