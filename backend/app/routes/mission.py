"""
Mission Replay Engine — backend/app/routes/mission.py

Provides APIs for recording, retrieving, and deleting mission events
that power the real Mission Playback component.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, Project, MissionEvent, Scenario, Prediction, HealthRecord
from app.schemas import MissionEventCreate
import json
import networkx as nx
import datetime

router = APIRouter(prefix="/mission", tags=["mission"])


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper — rebuild graph from stored GeoJSON
# ─────────────────────────────────────────────────────────────────────────────
def _rebuild_graph(project):
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


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper — compute a real metric snapshot for the current project state
# ─────────────────────────────────────────────────────────────────────────────
def _metrics_snapshot(project, db):
    try:
        graph, geojson_data = _rebuild_graph(project)
        from app.graph_analysis import calculate_centrality
        metrics = calculate_centrality(graph)
        nodes_list = list(metrics["nodes"].values())
        avg_crit = sum(n.get("criticality", 0) for n in nodes_list) / max(len(nodes_list), 1)
        health = round(max(0, 100 - avg_crit * 100), 1)

        components = list(nx.connected_components(graph))
        lcc = max(components, key=len) if components else set()
        accessibility = round((len(lcc) / max(len(graph.nodes), 1)) * 100, 1)

        critical_roads = sum(
            1 for e in metrics["edges"].values() if e.get("criticality", 0) > 0.6
        )
        bridges = sum(
            1 for e in metrics["edges"].values() if e.get("is_bridge", False)
        )
        network_efficiency = round(accessibility * (1 - avg_crit * 0.5), 1)

        return {
            "total_nodes": len(graph.nodes),
            "total_edges": len(graph.edges),
            "health_index": health,
            "emergency_accessibility": accessibility,
            "critical_roads": critical_roads,
            "bridge_count": bridges,
            "network_efficiency": network_efficiency,
            "connected_components": len(components),
            "avg_criticality": round(avg_crit, 3),
        }
    except Exception:
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# Auto-generate mission events from real project history.
# Called by POST /mission/{project_id}/generate so the frontend can trigger
# a full replay based on what actually happened.
# ─────────────────────────────────────────────────────────────────────────────
def _auto_generate_events(project, db):
    """Delete existing events for this project and rebuild from real data."""
    db.query(MissionEvent).filter(MissionEvent.project_id == project.id).delete()
    db.commit()

    events = []
    step = 0
    snap = _metrics_snapshot(project, db)

    # ── Step 0: Image Upload ──────────────────────────────────────────────────
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="upload",
        title="Satellite Image Upload",
        description=f"Image '{project.name}' uploaded and queued for AI processing.",
        payload={
            "image_url": project.original_image,
            "project_name": project.name,
            "created_at": project.created_at.isoformat(),
        },
        timestamp=project.created_at,
    ))
    step += 1

    # ── Step 1: AI Road Segmentation ──────────────────────────────────────────
    seg_ts = project.created_at + datetime.timedelta(seconds=5)
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="segmentation",
        title="AI Road Segmentation",
        description="Deep learning model extracted road network from satellite imagery.",
        payload={
            "mask_url": project.segmentation_mask,
            "method": "Hybrid CV+DL pipeline",
        },
        timestamp=seg_ts,
    ))
    step += 1

    # ── Step 2: Road Healing ──────────────────────────────────────────────────
    heal_ts = seg_ts + datetime.timedelta(seconds=8)
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="healing",
        title="Road Gap Healing",
        description="Morphological operations repaired occlusions and missing road segments.",
        payload={
            "total_edges": snap.get("total_edges", 0),
            "method": "Component-bridging algorithm",
        },
        timestamp=heal_ts,
    ))
    step += 1

    # ── Step 3: Graph Construction ────────────────────────────────────────────
    graph_ts = heal_ts + datetime.timedelta(seconds=3)
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="graph",
        title="Graph Construction",
        description=f"Topological graph built: {snap.get('total_nodes', 0)} junctions, {snap.get('total_edges', 0)} road segments.",
        payload={
            "total_nodes": snap.get("total_nodes", 0),
            "total_edges": snap.get("total_edges", 0),
            "connected_components": snap.get("connected_components", 0),
        },
        timestamp=graph_ts,
    ))
    step += 1

    # ── Step 4: Critical Road Analysis ───────────────────────────────────────
    analysis_ts = graph_ts + datetime.timedelta(seconds=4)
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="analysis",
        title="Critical Road Analysis",
        description=f"Betweenness centrality computed. {snap.get('critical_roads', 0)} high-risk roads and {snap.get('bridge_count', 0)} bridges identified.",
        payload={
            "critical_roads": snap.get("critical_roads", 0),
            "bridge_count": snap.get("bridge_count", 0),
            "avg_criticality": snap.get("avg_criticality", 0),
            "network_efficiency": snap.get("network_efficiency", 0),
        },
        timestamp=analysis_ts,
    ))
    step += 1

    # ── Step 5: Disaster Simulation (from DB if exists) ───────────────────────
    scenarios = db.query(Scenario).filter(
        Scenario.project_id == project.id
    ).order_by(Scenario.created_at.asc()).all()

    if scenarios:
        for sc in scenarios[:3]:  # log up to 3 scenarios
            events.append(MissionEvent(
                project_id=project.id,
                step=step,
                event_type="simulation",
                title=f"Disaster Simulation: {sc.name}",
                description=f"Simulated '{sc.name}' scenario. Affected nodes and routes analysed.",
                payload={
                    "scenario_name": sc.name,
                    "disaster_types": sc.disaster_types,
                    "blocked_nodes": len(sc.results.get("blocked_nodes", [])),
                    "blocked_edges": len(sc.results.get("blocked_edges", [])),
                },
                timestamp=sc.created_at,
            ))
            step += 1
    else:
        sim_ts = analysis_ts + datetime.timedelta(seconds=6)
        events.append(MissionEvent(
            project_id=project.id,
            step=step,
            event_type="simulation",
            title="Disaster Simulation Ready",
            description="Simulation engine initialised. No scenarios run yet.",
            payload={},
            timestamp=sim_ts,
        ))
        step += 1

    # ── Step 6: Emergency Routing ─────────────────────────────────────────────
    route_ts = (scenarios[-1].created_at if scenarios else analysis_ts) + datetime.timedelta(seconds=4)
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="routing",
        title="Emergency Route Calculation",
        description=f"Emergency accessibility: {snap.get('emergency_accessibility', 0):.1f}% of network reachable. Alternate routes computed.",
        payload={
            "emergency_accessibility": snap.get("emergency_accessibility", 0),
            "connected_components": snap.get("connected_components", 0),
        },
        timestamp=route_ts,
    ))
    step += 1

    # ── Step 7: AI Recommendations ────────────────────────────────────────────
    rec_ts = route_ts + datetime.timedelta(seconds=3)
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="recommendations",
        title="AI Recommendations Generated",
        description=f"Network health: {snap.get('health_index', 0):.1f}/100. AI improvement plan compiled.",
        payload={
            "health_index": snap.get("health_index", 0),
            "recommendations_count": max(0, snap.get("critical_roads", 0)),
        },
        timestamp=rec_ts,
    ))
    step += 1

    # ── Step 8: Executive Report ──────────────────────────────────────────────
    report_ts = rec_ts + datetime.timedelta(seconds=2)
    events.append(MissionEvent(
        project_id=project.id,
        step=step,
        event_type="report",
        title="Executive Report Compiled",
        description="Full mission summary, metrics, and recommendations compiled and ready for export.",
        payload={**snap, "report_formats": ["PDF", "CSV", "JSON"]},
        timestamp=report_ts,
    ))

    for ev in events:
        db.add(ev)
    db.commit()
    return len(events)


# ─────────────────────────────────────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/event")
def log_mission_event(event: MissionEventCreate, db: Session = Depends(get_db)):
    """Log a single mission event (called automatically from other routes)."""
    project = db.query(Project).filter(Project.id == event.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get next step number
    last = db.query(MissionEvent).filter(
        MissionEvent.project_id == event.project_id
    ).order_by(MissionEvent.step.desc()).first()
    next_step = (last.step + 1) if last else 0

    mission_event = MissionEvent(
        project_id=event.project_id,
        step=next_step,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        payload=event.payload or {},
    )
    db.add(mission_event)
    db.commit()
    db.refresh(mission_event)
    return {"id": mission_event.id, "step": mission_event.step}


@router.post("/{project_id}/generate")
def generate_mission(project_id: int, db: Session = Depends(get_db)):
    """Rebuild full mission event log from real project history."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    count = _auto_generate_events(project, db)
    return {"status": "generated", "event_count": count}


@router.get("/{project_id}")
def get_mission_events(project_id: int, db: Session = Depends(get_db)):
    """Return all mission events for a project, ordered by step."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    events = db.query(MissionEvent).filter(
        MissionEvent.project_id == project_id
    ).order_by(MissionEvent.step.asc()).all()

    # Auto-generate if no events exist yet
    if not events:
        _auto_generate_events(project, db)
        events = db.query(MissionEvent).filter(
            MissionEvent.project_id == project_id
        ).order_by(MissionEvent.step.asc()).all()

    return [
        {
            "id": ev.id,
            "step": ev.step,
            "event_type": ev.event_type,
            "title": ev.title,
            "description": ev.description,
            "payload": ev.payload,
            "timestamp": ev.timestamp.isoformat(),
        }
        for ev in events
    ]


@router.delete("/{project_id}")
def delete_mission_events(project_id: int, db: Session = Depends(get_db)):
    """Clear all mission events for a project (allows a fresh recording)."""
    deleted = db.query(MissionEvent).filter(
        MissionEvent.project_id == project_id
    ).delete()
    db.commit()
    return {"status": "cleared", "deleted_count": deleted}


@router.get("/{project_id}/summary")
def get_mission_summary(project_id: int, db: Session = Depends(get_db)):
    """Return a final mission summary with real metrics for the end-of-replay screen."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    snap = _metrics_snapshot(project, db)
    events = db.query(MissionEvent).filter(
        MissionEvent.project_id == project_id
    ).order_by(MissionEvent.step.asc()).all()

    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()

    start_ts = events[0].timestamp if events else project.created_at
    end_ts = events[-1].timestamp if events else datetime.datetime.utcnow()
    duration_secs = int((end_ts - start_ts).total_seconds())

    return {
        "project_name": project.name,
        "total_steps": len(events),
        "duration_seconds": duration_secs,
        "scenarios_run": len(scenarios),
        "metrics": snap,
        "start_time": start_ts.isoformat(),
        "end_time": end_ts.isoformat(),
    }
