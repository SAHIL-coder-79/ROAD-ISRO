import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

# Load environment variables from backend/.env (ignored by git)
load_dotenv()

from app.config import BASE_DIR, PORT, HOST
from app.database import init_db
from app.routes import project
from app.routes import copilot
from app.routes import infrastructure
from app.routes import analytics_advanced
from app.routes import report
from app.routes import mission

app = FastAPI(title="RoadShield AI - Geospatial API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

static_dir = BASE_DIR / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(project.router)
app.include_router(copilot.router)
app.include_router(infrastructure.router)
app.include_router(analytics_advanced.router)
app.include_router(report.router)
app.include_router(mission.router)

@app.get("/")
def read_root():
    return {
        "app": "RoadShield AI",
        "description": "Enterprise Disaster Resilience Platform v2.0",
        "status": "online",
        "version": "2.0.0",
        "features": [
            "AI Road Extraction", "Road Healing", "Graph Construction",
            "Graph Analytics", "Explainable AI", "Disaster Simulation",
            "Emergency Routing", "AI Recommendation Engine",
            "Urban Risk Heatmap", "Mission Dashboard", "AI Copilot",
            "Executive Reports", "Infrastructure Impact", "Digital Twin",
            "Predictive AI", "Network Health Index", "Budget Optimizer",
            "Scenario Generator", "Mission Playback", "Command Center",
            "Confidence Overlay", "Multi-City Comparison", "Auto Story Mode",
            "Recovery Score", "Smart Alert System"
        ]
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
