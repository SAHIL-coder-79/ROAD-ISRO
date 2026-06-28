from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    original_image: str
    segmentation_mask: str
    geojson_network: str
    created_at: datetime

    class Config:
        from_attributes = True

class SimulationRequest(BaseModel):
    blocked_nodes: List[str] = []
    blocked_edges: List[List[str]] = []
    source_node: Optional[str] = None
    target_node: Optional[str] = None
    disaster_type: Optional[str] = None

class CopilotRequest(BaseModel):
    message: str
    project_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = None

class CopilotResponse(BaseModel):
    reply: str
    actions: List[Dict[str, Any]] = []
    suggestions: List[str] = []

class BudgetRequest(BaseModel):
    budget_amount: float
    currency: str = "INR"
    project_id: int

class ScenarioRequest(BaseModel):
    disaster_types: List[str]
    project_id: int
    intensity: Optional[float] = 1.0

class ComparisonRequest(BaseModel):
    project_ids: List[int]

class InfrastructureImpactRequest(BaseModel):
    project_id: int
    disaster_type: str
    affected_nodes: List[str] = []
    affected_edges: List[str] = []

class AlertRecord(BaseModel):
    type: str
    message: str
    severity: str = "info"
    project_id: Optional[int] = None

class PredictionRequest(BaseModel):
    project_id: int
    prediction_type: str = "vulnerability"

class MissionEventCreate(BaseModel):
    project_id: int
    event_type: str
    title: str
    description: str = ""
    payload: Optional[Dict[str, Any]] = {}
