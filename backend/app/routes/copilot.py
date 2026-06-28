from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db, Project
from app.schemas import CopilotRequest, CopilotResponse
import json
import networkx as nx
import os
from google import genai
from pydantic import BaseModel, Field

# Load GEMINI_API_KEY from environment — never hardcode credentials
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter(prefix="/copilot", tags=["copilot"])

def rebuild_graph(project):
    geojson_data = json.loads(project.geojson_network)
    graph = nx.Graph()
    for feature in geojson_data["features"]:
        if feature["properties"]["type"] == "junction":
            node_id = feature["properties"]["id"]
            lon, lat = feature["geometry"]["coordinates"]
            graph.add_node(node_id, lat=lat, lon=lon)
    for feature in geojson_data["features"]:
        if feature["properties"]["type"] == "road":
            u = feature["properties"]["source"]
            v = feature["properties"]["target"]
            weight = feature["properties"].get("weight", 1.0)
            graph.add_edge(u, v, weight=weight)
    return graph, geojson_data

# Pydantic schemas for LLM structured output
class RoadSchema(BaseModel):
    source: str
    target: str
    criticality: float = 0.0
    is_bridge: bool = False

class ActionSchema(BaseModel):
    type: str = Field(description="Action type: 'highlight_roads', 'zoom_bridges', 'simulate_disaster', 'open_recommendations', 'show_health', 'show_emergency_routes', 'generate_report'")
    roads: list[RoadSchema] | None = Field(default=None, description="List of road segments for highlight_roads action.")
    bridges: list[RoadSchema] | None = Field(default=None, description="List of bridge segments for zoom_bridges action.")
    disaster: str | None = Field(default=None, description="Disaster type for simulate_disaster action (e.g., 'Flood').")

class LLMCopilotResponse(BaseModel):
    reply: str = Field(description="Markdown reply to the user.")
    actions: list[ActionSchema] = Field(description="UI actions to trigger.")
    suggestions: list[str] = Field(description="Suggested follow-up queries.")

@router.post("/chat", response_model=CopilotResponse)
def copilot_chat(req: CopilotRequest, db: Session = Depends(get_db)):
    if not req.project_id:
        return CopilotResponse(
            reply="Please load a project first to enable AI Copilot analysis.",
            actions=[],
            suggestions=["Upload a satellite image", "Select an existing project", "How does RoadShield work?"]
        )

    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        return CopilotResponse(
            reply="Project not found.",
            actions=[],
            suggestions=["Upload a satellite image"]
        )

    # 1. Extract context
    graph, geojson_data = rebuild_graph(project)
    
    from app.graph_analysis import calculate_centrality
    metrics = calculate_centrality(graph)
    nodes_list = list(metrics["nodes"].values())
    avg_crit = sum(n.get("criticality", 0) for n in nodes_list) / max(len(nodes_list), 1)
    health = max(0, 100 - avg_crit * 100)
    
    components = list(nx.connected_components(graph))
    lcc = max(components, key=len) if components else []
    accessibility = (len(lcc) / len(graph.nodes)) * 100 if graph.nodes else 0
    
    critical_roads = []
    bridges = []
    for feature in geojson_data["features"]:
        if feature["properties"]["type"] == "road":
            crit = feature["properties"].get("criticality", 0)
            is_bridge = feature["properties"].get("is_bridge", False)
            road_data = {
                "source": feature["properties"]["source"],
                "target": feature["properties"]["target"],
                "criticality": crit,
                "is_bridge": is_bridge
            }
            if crit > 0.6:
                critical_roads.append(road_data)
            if is_bridge:
                bridges.append(road_data)
                
    critical_roads = sorted(critical_roads, key=lambda x: x["criticality"], reverse=True)[:20]
    
    # 2. Build system prompt
    system_prompt = f"""You are the RoadShield AI Copilot, an expert in geospatial analysis, network resilience, and disaster management.
You are helping a user analyze a road network project named '{project.name}'.

CURRENT PROJECT CONTEXT:
- Network Size: {len(graph.nodes)} junctions, {len(graph.edges)} roads
- Network Health Index: {health:.1f}/100 (Avg criticality: {avg_crit:.1%})
- Disconnected Regions: {len(components)}
- Emergency Route Accessibility (LCC): {accessibility:.1f}%
- Critical Bridges Count: {len(bridges)}
- High Vulnerability Roads Count: {len(critical_roads)}

Top 5 Most Critical Roads (use these if asking for vulnerable roads):
{json.dumps(critical_roads[:5], indent=2)}

Top 5 Bridges (use these if asking about bridges):
{json.dumps(bridges[:5], indent=2)}

You must respond to the user's message thoughtfully using this data.
Your response will be parsed as JSON matching the requested schema.
- 'reply': Your markdown-formatted textual response.
- 'actions': A list of UI actions. Valid types are:
  - 'highlight_roads': Highlight specific roads (provide 'roads' array with source/target).
  - 'zoom_bridges': Zoom into bridges (provide 'bridges' array with source/target).
  - 'simulate_disaster': Trigger a simulation (provide 'disaster' string like 'Flood').
  - 'open_recommendations': Open AI recommendations panel.
  - 'show_health': Show health metrics.
  - 'show_emergency_routes': Display routes.
  - 'generate_report': Trigger report generation.
- 'suggestions': A list of 3 short, relevant follow-up questions the user can click.

Ensure your JSON strictly matches the schema and do not hallucinate metrics not provided in this context.
"""

    # 3. Call Gemini
    if not GEMINI_API_KEY:
        return CopilotResponse(
            reply="⚠️ AI Copilot is not configured. Please set the `GEMINI_API_KEY` environment variable on the server.",
            actions=[],
            suggestions=["Contact your administrator", "Check server configuration"]
        )

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=req.message,
            config={
                'system_instruction': system_prompt,
                'response_mime_type': 'application/json',
                'response_schema': LLMCopilotResponse,
            }
        )
        llm_resp = response.parsed
        
        # Format actions back to dicts removing Nones
        final_actions = []
        for a in llm_resp.actions:
            act = {"type": a.type}
            if a.roads:
                act["roads"] = [r.model_dump() for r in a.roads]
            if a.bridges:
                act["bridges"] = [b.model_dump() for b in a.bridges]
            if a.disaster:
                act["disaster"] = a.disaster
            final_actions.append(act)
            
        return CopilotResponse(
            reply=llm_resp.reply,
            actions=final_actions,
            suggestions=llm_resp.suggestions
        )
        
    except Exception as e:
        print(f"LLM Error: {e}")
        # Fallback if LLM fails (e.g. no API key)
        return CopilotResponse(
            reply=f"⚠️ LLM Error: {str(e)}\n\nPlease ensure your GEMINI_API_KEY is valid and the google-genai library is working.",
            actions=[],
            suggestions=["Retry"]
        )

