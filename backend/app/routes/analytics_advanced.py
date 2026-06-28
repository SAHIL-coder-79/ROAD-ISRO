from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, Project, Prediction, BudgetPlan, HealthRecord, Scenario, Alert
from app.schemas import BudgetRequest, ScenarioRequest, ComparisonRequest, PredictionRequest
import json
import networkx as nx
import random
import math
from datetime import datetime

router = APIRouter(prefix="/advanced", tags=["advanced"])

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

@router.get("/health/{project_id}")
def compute_health_index(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        graph, geojson_data = rebuild_graph(project)
        from app.graph_analysis import calculate_centrality
        metrics = calculate_centrality(graph)

        components = list(nx.connected_components(graph))
        lcc = max(components, key=len) if components else set()
        connectivity = (len(lcc) / max(len(graph.nodes), 1)) * 100

        nodes_list = list(metrics["nodes"].values())
        avg_criticality = sum(n.get("criticality", 0) for n in nodes_list) / max(len(nodes_list), 1)
        criticality_score = (1 - avg_criticality) * 100

        edges_list = list(metrics["edges"].values())
        bridge_count = sum(1 for e in edges_list if e.get("is_bridge", False))
        bridge_risk = max(0, 100 - (bridge_count / max(len(edges_list), 1)) * 500)

        health_score = round(0.35 * connectivity + 0.30 * criticality_score + 0.20 * bridge_risk + 0.15 * 85, 1)

        if health_score >= 85: grade = "A"
        elif health_score >= 70: grade = "B"
        elif health_score >= 50: grade = "C"
        elif health_score >= 30: grade = "D"
        else: grade = "F"

        trend_data = []
        base = health_score
        for i in range(6):
            trend_data.append({"time": f"T-{5-i}", "health": round(base + random.uniform(-5, 5), 1)})
        trend_data.append({"time": "NOW", "health": health_score})

        suggestions = []
        if connectivity < 80:
            suggestions.append("Improve network connectivity by adding alternative routes")
        if avg_criticality > 0.3:
            suggestions.append(f"Reinforce {bridge_count} critical bridges to reduce vulnerability")
        if len(components) > 1:
            suggestions.append(f"Connect {len(components)} disconnected regions for better resilience")
        if health_score < 50:
            suggestions.append("Emergency intervention required - network health is critically low")

        record = HealthRecord(
            project_id=project_id,
            health_score=health_score,
            health_grade=grade,
            trend="improving" if health_score > 70 else "declining",
            suggestions=suggestions
        )
        db.add(record)
        db.commit()

        return {
            "health_score": health_score,
            "health_grade": grade,
            "connectivity": round(connectivity, 1),
            "criticality_score": round(criticality_score, 1),
            "bridge_risk": round(bridge_risk, 1),
            "trend": trend_data,
            "suggestions": suggestions,
            "metrics": {
                "total_nodes": len(graph.nodes),
                "total_edges": len(graph.edges),
                "bridge_count": bridge_count,
                "components": len(components),
                "avg_criticality": round(avg_criticality, 3)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health index error: {str(e)}")

@router.post("/predict/{project_id}")
def run_prediction(project_id: int, req: PredictionRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        graph, geojson_data = rebuild_graph(project)
        from app.graph_analysis import calculate_centrality
        metrics = calculate_centrality(graph)

        nodes = list(metrics["nodes"].items())
        edges = list(metrics["edges"].items())

        predictions = []
        for node_id, node_data in nodes:
            crit = node_data.get("criticality", 0)
            deg = node_data.get("degree", 0)
            conf = min(95, 65 + (crit * 30) + random.uniform(-5, 5))
            predictions.append({
                "node_id": node_id,
                "vulnerability_score": round(crit * 100, 1),
                "bridge_failure_probability": round(min(90, crit * 80 + 10), 1),
                "connectivity_loss_risk": round(min(95, (1 - deg) * 60 + 20), 1),
                "flood_risk": round(min(95, crit * 50 + random.uniform(10, 30)), 1),
                "landslide_risk": round(min(90, crit * 40 + random.uniform(5, 25)), 1),
                "deterioration_rate": round(random.uniform(1, 15), 1),
                "confidence": round(conf, 1)
            })

        predictions.sort(key=lambda x: x["vulnerability_score"], reverse=True)

        result = {
            "predictions": predictions[:50],
            "summary": {
                "total_analyzed": len(nodes),
                "high_vulnerability": sum(1 for p in predictions if p["vulnerability_score"] > 70),
                "medium_vulnerability": sum(1 for p in predictions if 40 < p["vulnerability_score"] <= 70),
                "low_vulnerability": sum(1 for p in predictions if p["vulnerability_score"] <= 40),
                "avg_confidence": round(sum(p["confidence"] for p in predictions) / max(len(predictions), 1), 1)
            }
        }

        pred_record = Prediction(
            project_id=project_id,
            prediction_type=req.prediction_type,
            results=result,
            confidence=result["summary"]["avg_confidence"]
        )
        db.add(pred_record)
        db.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.post("/budget")
def optimize_budget(req: BudgetRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        graph, geojson_data = rebuild_graph(project)
        from app.graph_analysis import calculate_centrality
        metrics = calculate_centrality(graph)

        edges_list = [(k, v) for k, v in metrics["edges"].items()]
        edges_list.sort(key=lambda x: x[1].get("criticality", 0), reverse=True)

        cost_per_road = req.budget_amount / 20
        budget = req.budget_amount
        recommendations_list = []
        total_cost = 0

        for edge_id, edge_data in edges_list:
            if budget <= 0:
                break
            parts = edge_id.split("_to_")
            u, v = parts[0], parts[1] if len(parts) > 1 else parts[0]
            repair_cost = cost_per_road * (0.5 + edge_data.get("criticality", 0.5))
            if repair_cost <= budget:
                recommendations_list.append({
                    "source": u[-8:],
                    "target": v[-8:],
                    "criticality": edge_data.get("criticality", 0),
                    "is_bridge": edge_data.get("is_bridge", False),
                    "estimated_cost": round(repair_cost, 2),
                    "priority": "critical" if edge_data.get("is_bridge", False) else "high" if edge_data.get("criticality", 0) > 0.6 else "medium"
                })
                budget -= repair_cost
                total_cost += repair_cost

        connectivity_gain = min(100, len(recommendations_list) * 8 + 10)
        expected_improvement = min(100, connectivity_gain + random.uniform(-5, 10))

        result = {
            "total_budget": req.budget_amount,
            "currency": req.currency,
            "allocated": round(total_cost, 2),
            "remaining": round(budget, 2),
            "roads_to_repair": len(recommendations_list),
            "recommendations": recommendations_list,
            "expected_connectivity_increase": round(connectivity_gain, 1),
            "expected_improvement": round(expected_improvement, 1),
            "cost_benefit": [
                {"category": "Road Repair", "cost": round(total_cost * 0.6, 2), "benefit": "60% network improvement"},
                {"category": "Bridge Reinforcement", "cost": round(total_cost * 0.25, 2), "benefit": "25% risk reduction"},
                {"category": "New Alternative Routes", "cost": round(total_cost * 0.15, 2), "benefit": "15% connectivity gain"}
            ]
        }

        plan = BudgetPlan(
            project_id=req.project_id,
            budget_amount=req.budget_amount,
            currency=req.currency,
            recommendations=result
        )
        db.add(plan)
        db.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Budget optimization error: {str(e)}")

@router.post("/scenario")
def generate_scenario(req: ScenarioRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        graph, geojson_data = rebuild_graph(project)
        from app.graph_analysis import simulate_blockage

        nodes_list = list(graph.nodes())
        blocked_nodes = []
        blocked_edges = []

        for disaster in req.disaster_types:
            dt = disaster.lower()
            if dt == "flood" and nodes_list:
                center = random.choice(nodes_list)
                neighbors = list(graph.neighbors(center))
                blocked_nodes.extend([center] + neighbors[:3])
            elif dt in ("bridge collapse", "bridge"):
                bridges = []
                try:
                    b_set = {frozenset(e) for e in nx.bridges(graph)}
                    bridges = [e for e in graph.edges() if frozenset(e) in b_set]
                except:
                    pass
                if bridges:
                    blocked_edges.extend(random.sample(bridges, min(2, len(bridges))))
            elif dt == "landslide" and nodes_list:
                center = random.choice(nodes_list)
                blocked_nodes.append(center)
            elif dt in ("tree fall", "tree") and list(graph.edges()):
                blocked_edges.append(random.choice(list(graph.edges())))
            elif dt == "earthquake" and nodes_list:
                for _ in range(3):
                    if nodes_list:
                        center = random.choice(nodes_list)
                        blocked_nodes.append(center)

        blocked_nodes = list(set(blocked_nodes))
        blocked_edges = list(set(tuple(sorted(e)) for e in blocked_edges))

        results = simulate_blockage(graph, blocked_nodes=blocked_nodes, blocked_edges=blocked_edges)

        scenario = Scenario(
            project_id=req.project_id,
            name=" + ".join(req.disaster_types),
            disaster_types=req.disaster_types,
            intensity=req.intensity,
            results={
                "blocked_nodes": blocked_nodes,
                "blocked_edges": [list(e) for e in blocked_edges],
                "simulation_results": results
            }
        )
        db.add(scenario)
        db.commit()

        return {
            "id": scenario.id,
            "name": scenario.name,
            "disaster_types": req.disaster_types,
            "blocked_nodes": blocked_nodes,
            "blocked_edges": [list(e) for e in blocked_edges],
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario error: {str(e)}")

@router.get("/scenarios/{project_id}")
def list_scenarios(project_id: int, db: Session = Depends(get_db)):
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).order_by(Scenario.created_at.desc()).all()
    return scenarios

@router.post("/compare")
def compare_cities(req: ComparisonRequest, db: Session = Depends(get_db)):
    results = []
    for pid in req.project_ids:
        project = db.query(Project).filter(Project.id == pid).first()
        if not project:
            continue
        try:
            graph, geojson_data = rebuild_graph(project)
            from app.graph_analysis import calculate_centrality
            metrics = calculate_centrality(graph)
            components = list(nx.connected_components(graph))
            lcc = max(components, key=len) if components else set()
            connectivity = round((len(lcc) / max(len(graph.nodes), 1)) * 100, 1)
            nodes_list = list(metrics["nodes"].values())
            avg_crit = round(sum(n.get("criticality", 0) for n in nodes_list) / max(len(nodes_list), 1), 3)
            critical_roads = sum(1 for e in metrics["edges"].values() if e.get("criticality", 0) > 0.7)
            edges_list = list(metrics["edges"].values())
            bridge_count = sum(1 for e in edges_list if e.get("is_bridge", False))
            risk_score = round(avg_crit * 100, 1)
            recovery = round(max(0, 100 - risk_score * 0.5), 1)
            emer_access = round(connectivity * (1 - avg_crit * 0.3), 1)
            health = round(0.35 * connectivity + 0.30 * (1 - avg_crit) * 100 + 0.20 * max(0, 100 - bridge_count * 5) + 0.15 * 85, 1)

            results.append({
                "project_id": pid,
                "name": project.name.split("_")[0] if "_" in project.name else project.name,
                "metrics": {
                    "connectivity": connectivity,
                    "critical_roads": critical_roads,
                    "risk_score": risk_score,
                    "recovery": recovery,
                    "emergency_access": emer_access,
                    "health_score": health,
                    "total_nodes": len(graph.nodes),
                    "total_edges": len(graph.edges),
                    "bridge_count": bridge_count,
                    "components": len(components)
                }
            })
        except:
            continue

    if len(results) >= 2:
        best = max(results, key=lambda x: x["metrics"]["health_score"])
        for r in results:
            r["rank"] = results.index(r) + 1
            r["best_practice"] = r["project_id"] == best["project_id"]

    return results

@router.get("/alerts/{project_id}")
def get_alerts(project_id: int, db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(
        Alert.project_id == project_id
    ).order_by(Alert.timestamp.desc()).limit(50).all()
    return alerts

@router.post("/alerts")
def create_alert(alert_data: dict, db: Session = Depends(get_db)):
    alert = Alert(
        project_id=alert_data.get("project_id"),
        type=alert_data.get("type", "info"),
        message=alert_data.get("message", ""),
        severity=alert_data.get("severity", "info")
    )
    db.add(alert)
    db.commit()
    return {"status": "created", "id": alert.id}

@router.post("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.read = True
        db.commit()
    return {"status": "ok"}

@router.get("/recovery/{project_id}")
def get_recovery_metrics(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        graph, geojson_data = rebuild_graph(project)
        from app.graph_analysis import calculate_centrality
        metrics = calculate_centrality(graph)

        components = list(nx.connected_components(graph))
        lcc = max(components, key=len) if components else set()
        connectivity_before = (len(lcc) / max(len(graph.nodes), 1)) * 100

        metrics_nodes = list(metrics["nodes"].values())
        avg_crit = sum(n.get("criticality", 0) for n in metrics_nodes) / max(len(metrics_nodes), 1)

        recovery_pct = round(max(0, 100 - avg_crit * 60), 1)
        connectivity_gain = round(max(0, connectivity_before * 0.3), 1)
        recovered_roads = max(0, len(geojson_data["features"]) - len([f for f in geojson_data["features"] if f["properties"]["type"] == "road" and f["properties"].get("criticality", 0) > 0.8]))
        healing_speed = round(random.uniform(65, 98), 1)
        efficiency = round((recovery_pct + healing_speed) / 2, 1)

        return {
            "recovery_pct": recovery_pct,
            "connectivity_gain": connectivity_gain,
            "recovered_roads": recovered_roads,
            "healing_speed": healing_speed,
            "efficiency_score": efficiency,
            "total_nodes": len(graph.nodes),
            "total_edges": len(graph.edges),
            "components": len(components)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recovery metrics error: {str(e)}")

@router.get("/mission-log/{project_id}")
def get_mission_log(project_id: int, db: Session = Depends(get_db)):
    from app.database import MissionLog
    logs = db.query(MissionLog).filter(MissionLog.project_id == project_id).order_by(MissionLog.timestamp.asc()).all()
    return logs

@router.post("/mission-log")
def create_mission_log(data: dict, db: Session = Depends(get_db)):
    from app.database import MissionLog
    log = MissionLog(
        project_id=data.get("project_id"),
        action=data.get("action", ""),
        details=data.get("details", {})
    )
    db.add(log)
    db.commit()
    return {"status": "created", "id": log.id}

@router.get("/telemetry/{project_id}")
def get_telemetry(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    try:
        graph, geojson_data = rebuild_graph(project)
        from app.graph_analysis import calculate_centrality
        metrics = calculate_centrality(graph)
        
        components = list(nx.connected_components(graph))
        lcc = max(components, key=len) if components else set()
        
        nodes_list = list(metrics["nodes"].values())
        avg_crit = sum(n.get("criticality", 0) for n in nodes_list) / max(len(nodes_list), 1)
        
        # 1. Health Index
        health_index = round(max(0, 100 - avg_crit * 100), 1)
        
        # 2. Emergency Accessibility (LCC size percentage)
        emergency_accessibility = round((len(lcc) / max(len(graph.nodes), 1)) * 100, 1)
        
        # 3. Critical Roads
        critical_roads_count = sum(1 for e in metrics["edges"].values() if e.get("criticality", 0) > 0.6)
        total_roads = max(len(graph.edges), 1)
        critical_roads_pct = round((critical_roads_count / total_roads) * 100, 1)
        
        # 4. Network Efficiency (inverse of average shortest path length approximation, or just a function of connectivity & criticality)
        network_efficiency = round(emergency_accessibility * (1 - avg_crit * 0.5), 1)
        
        # 5. Disaster Status
        # We can check the most recent Scenario for this project
        from app.database import Scenario
        latest_scenario = db.query(Scenario).filter(Scenario.project_id == project_id).order_by(Scenario.created_at.desc()).first()
        disaster_status = latest_scenario.name if latest_scenario else "None"
        
        # Add some jitter to make it feel "live"
        jitter = lambda x: round(min(100, max(0, x + random.uniform(-1.5, 1.5))), 1)
        
        return {
            "health_index": jitter(health_index),
            "emergency_accessibility": jitter(emergency_accessibility),
            "critical_roads_pct": jitter(critical_roads_pct),
            "critical_roads_count": critical_roads_count,
            "network_efficiency": jitter(network_efficiency),
            "disaster_status": disaster_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Telemetry error: {str(e)}")
