import logging
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
from app.config import DATABASE_URL

logger = logging.getLogger("roadshield.db")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.warning(f"Failed to connect to database URL {DATABASE_URL}, falling back to SQLite. Error: {e}")
    engine = create_engine("sqlite:///./roadshield.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    original_image = Column(String)
    segmentation_mask = Column(String)
    geojson_network = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class InfrastructureAsset(Base):
    __tablename__ = "infrastructure_assets"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True)
    asset_type = Column(String)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    node_id = Column(String, nullable=True)
    properties = Column(JSON, default={})

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True, nullable=True)
    type = Column(String)
    message = Column(String)
    severity = Column(String, default="info")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    read = Column(Boolean, default=False)

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True)
    name = Column(String)
    disaster_types = Column(JSON)
    intensity = Column(Float, default=1.0)
    results = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True)
    prediction_type = Column(String)
    results = Column(JSON)
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MissionLog(Base):
    __tablename__ = "mission_logs"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True)
    action = Column(String)
    details = Column(JSON, default={})
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class MissionEvent(Base):
    __tablename__ = "mission_events"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True)
    step = Column(Integer)           # sequential order within a mission
    event_type = Column(String)      # upload | segmentation | healing | graph | analysis | simulation | routing | recommendations | report
    title = Column(String)
    description = Column(Text, default="")
    payload = Column(JSON, default={})  # real metrics snapshot at this step
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class BudgetPlan(Base):
    __tablename__ = "budget_plans"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True)
    budget_amount = Column(Float)
    currency = Column(String, default="INR")
    recommendations = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class HealthRecord(Base):
    __tablename__ = "health_records"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, index=True)
    health_score = Column(Float)
    health_grade = Column(String)
    trend = Column(String)
    suggestions = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
