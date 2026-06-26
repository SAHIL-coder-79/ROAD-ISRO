from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, Project, InfrastructureAsset, Alert
from app.schemas import InfrastructureImpactRequest
import json
import networkx as nx
import random
import math

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])

INFRA_TYPES = [
    "hospital", "school", "police_station", "fire_station",
    "airport", "railway_station", "power_grid", "water_supply"
]

INFRA_ICONS = {
    "hospital": "🏥", "school": "🏫", "police_station": "🚓",
    "fire_station": "🚒", "airport": "✈️", "railway_station": "🚂",
    "power_grid": "⚡", "water_supply": "💧"
}

@router.get("/assets/{project_id}")
def get_infrastructure_assets(project_id: int, db: Session = Depends(get_db)):
    assets = db.query(InfrastructureAsset).filter(InfrastructureAsset.project_id == project_id).all()
    if not assets:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        try:
            geojson_data = json.loads(project.geojson_network)
            junctions = [f for f in geojson_data["features"] if f["properties"]["type"] == "junction"]
            if junctions:
                random.seed(project_id)
                sample = random.sample(junctions, min(len(junctions), 8))
                for i, infra_type in enumerate(INFRA_TYPES):
                    if i < len(sample):
                        node = sample[i]
                        lon, lat = node["geometry"]["coordinates"]
                        asset = InfrastructureAsset(
                            project_id=project_id,
                            asset_type=infra_type,
                            name=f"{infra_type.replace('_', ' ').title()} #{i+1}",
                            lat=lat,
                            lon=lon,
                            node_id=node["properties"]["id"],
                            properties={"icon": INFRA_ICONS.get(infra_type, "📍")}
                        )
                        db.add(asset)
                db.commit()
                assets = db.query(InfrastructureAsset).filter(InfrastructureAsset.project_id == project_id).all()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate assets: {str(e)}")
    return assets

@router.post("/impact")
def calculate_impact(req: InfrastructureImpactRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
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
                graph.add_edge(u, v)

        assets = db.query(InfrastructureAsset).filter(InfrastructureAsset.project_id == req.project_id).all()
        affected_assets = []
        for asset in assets:
            if asset.node_id and asset.node_id in req.affected_nodes:
                affected_assets.append(asset)

        total_population = len(graph.nodes) * 500
        affected_nodes_count = len(req.affected_nodes)
        population_affected = affected_nodes_count * 500

        components_before = list(nx.connected_components(graph))
        sim_graph = graph.copy()
        for n in req.affected_nodes:
            if sim_graph.has_node(n):
                sim_graph.remove_node(n)
        components_after = list(nx.connected_components(sim_graph))

        buildings_disconnected = len(components_after) - len(components_before)
        hospitals_unreachable = sum(1 for a in assets if a.asset_type == "hospital" and a.node_id in req.affected_nodes)

        avg_delay = affected_nodes_count * random.uniform(2, 8)
        accessibility_reduction = (affected_nodes_count / max(len(graph.nodes), 1)) * 100
        lcc_before = len(max(components_before, key=len)) if components_before else 0
        lcc_after = len(max(components_after, key=len)) if components_after else 0
        recovery_estimate = max(1, int((1 - lcc_after / max(lcc_before, 1)) * 24))

        return {
            "population_affected": population_affected,
            "affected_assets": [
                {"name": a.name, "type": a.asset_type, "icon": INFRA_ICONS.get(a.asset_type, "📍")}
                for a in affected_assets
            ],
            "affected_assets_count": len(affected_assets),
            "buildings_disconnected": max(0, buildings_disconnected),
            "hospitals_unreachable": hospitals_unreachable,
            "avg_delay_minutes": round(avg_delay, 1),
            "accessibility_reduction": round(accessibility_reduction, 1),
            "recovery_hours_estimate": recovery_estimate,
            "disconnected_regions": len(components_after)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impact calculation error: {str(e)}")

@router.get("/types")
def get_infrastructure_types():
    return [{"type": t, "icon": INFRA_ICONS.get(t, "📍"), "label": t.replace("_", " ").title()} for t in INFRA_TYPES]
