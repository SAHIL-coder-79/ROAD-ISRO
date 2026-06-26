from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db, Project
from app.schemas import CopilotRequest, CopilotResponse
import json
import networkx as nx
import random

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

@router.post("/chat", response_model=CopilotResponse)
def copilot_chat(req: CopilotRequest, db: Session = Depends(get_db)):
    message = req.message.lower()
    actions = []
    suggestions = []
    reply = ""

    project = None
    if req.project_id:
        project = db.query(Project).filter(Project.id == req.project_id).first()

    if not project:
        reply = "Please load a project first to enable AI Copilot analysis."
        suggestions = ["Upload a satellite image", "Select an existing project", "How does RoadShield work?"]
        return CopilotResponse(reply=reply, actions=actions, suggestions=suggestions)

    graph, geojson_data = rebuild_graph(project)

    if "vulnerable" in message or "critical" in message or "risk" in message:
        critical_roads = []
        for feature in geojson_data["features"]:
            if feature["properties"]["type"] == "road":
                crit = feature["properties"].get("criticality", 0)
                is_bridge = feature["properties"].get("is_bridge", False)
                if crit > 0.6 or is_bridge:
                    critical_roads.append({
                        "source": feature["properties"]["source"],
                        "target": feature["properties"]["target"],
                        "criticality": crit,
                        "is_bridge": is_bridge
                    })
        critical_roads = sorted(critical_roads, key=lambda x: x["criticality"], reverse=True)[:10]
        reply = f"🔍 Found **{len(critical_roads)} critical roads** with high vulnerability scores."
        if critical_roads:
            reply += f"\n\nTop critical segment: `{critical_roads[0]['source'][-5:]} ↔ {critical_roads[0]['target'][-5:]}` (criticality: {critical_roads[0]['criticality']:.1%})"
        actions = [{"type": "highlight_roads", "roads": critical_roads}]
        suggestions = ["Show critical bridges", "What is the risk score?", "Generate recommendations"]

    elif "bridge" in message:
        bridges = []
        for feature in geojson_data["features"]:
            if feature["properties"]["type"] == "road" and feature["properties"].get("is_bridge", False):
                bridges.append(feature["properties"])
        reply = f"🌉 Found **{len(bridges)} critical bridges** in the network."
        if bridges:
            b = bridges[0]
            reply += f"\n\nMost critical bridge: `{b['source'][-5:]} ↔ {b['target'][-5:]}` (criticality: {b.get('criticality', 0):.1%})"
        actions = [{"type": "zoom_bridges", "bridges": bridges[:5]}]
        suggestions = ["Highlight all bridges", "Run bridge collapse simulation", "Reinforce bridges"]

    elif "hospital" in message or "flood" in message or "affected" in message:
        affected_roads = []
        for feature in geojson_data["features"]:
            if feature["properties"]["type"] == "road":
                affected_roads.append({
                    "source": feature["properties"]["source"],
                    "target": feature["properties"]["target"]
                })
        reply = f"⚠️ In a flood scenario, approximately **{len(affected_roads)} road segments** could be affected."
        actions = [{"type": "simulate_disaster", "disaster": "Flood"}]
        suggestions = ["Run flood simulation", "Show evacuation routes", "Calculate impact"]

    elif "recommendation" in message:
        from app.graph_analysis import generate_recommendations
        recs = generate_recommendations(graph)
        reply = f"💡 Generated **{len(recs)} AI recommendations** for network improvement."
        for r in recs[:3]:
            reply += f"\n- **{r['type']}**: {r['target']} → {r['description'][:80]}..."
        actions = [{"type": "open_recommendations"}]
        suggestions = ["Apply all recommendations", "View detailed analysis", "Export report"]

    elif "health" in message or "score" in message:
        from app.graph_analysis import calculate_centrality
        metrics = calculate_centrality(graph)
        nodes_list = list(metrics["nodes"].values())
        avg_crit = sum(n.get("criticality", 0) for n in nodes_list) / max(len(nodes_list), 1)
        health = max(0, 100 - avg_crit * 100)
        grade = "A" if health > 80 else "B" if health > 60 else "C" if health > 40 else "D"
        reply = f"🏥 **Network Health Index: {health:.1f}/100 (Grade {grade})**"
        reply += f"\n- Average criticality: {avg_crit:.1%}"
        reply += f"\n- Total nodes: {len(graph.nodes)}, Total edges: {len(graph.edges)}"
        actions = [{"type": "show_health"}]
        suggestions = ["How to improve health?", "Show critical nodes", "Compare with other cities"]

    elif "simulat" in message or "disaster" in message:
        disaster_types = ["Flood", "Earthquake", "Landslide", "Bridge Collapse", "Tree Fall"]
        reply = "🎯 **Disaster Simulation Ready.**\n\nAvailable simulations:\n"
        for dt in disaster_types:
            reply += f"- {dt}\n"
        reply += "\nWhich disaster would you like to simulate?"
        actions = [{"type": "open_simulation"}]
        suggestions = disaster_types + ["Combined scenario"]

    elif "route" in message or "emergency" in message:
        reply = "🚨 **Emergency Routing Analysis**\n\nEmergency services can access:\n"
        try:
            components = list(nx.connected_components(graph))
            lcc = max(components, key=len)
            accessibility = (len(lcc) / len(graph.nodes)) * 100
            reply += f"- {accessibility:.1f}% of the network is accessible\n"
            reply += f"- {len(components)} disconnected regions found\n"
        except:
            reply += "- Analysis in progress..."
        actions = [{"type": "show_emergency_routes"}]
        suggestions = ["Calculate average delay", "Show evacuation routes", "Optimize response time"]

    elif "summary" in message or "report" in message:
        reply = "📊 **Executive Summary**\n\n"
        try:
            components = list(nx.connected_components(graph))
            reply += f"Network size: {len(graph.nodes)} junctions, {len(graph.edges)} roads\n"
            reply += f"Connected components: {len(components)}\n"
            critical_count = sum(1 for _, d in graph.degree() if d <= 1)
            reply += f"Critical endpoints: {critical_count}\n"
            reply += "\nRecommendation: Use 'Generate Report' for full PDF export."
        except:
            reply += "Network loaded. Ready for analysis."
        actions = [{"type": "generate_report"}]
        suggestions = ["Export PDF", "Export GeoJSON", "View full analytics"]

    else:
        reply = "🤖 **AI Copilot Ready**\n\nI can help you with:\n- Vulnerability analysis\n- Bridge detection\n- Disaster simulation\n- Emergency routing\n- Network health\n- Recommendations\n- Report generation\n\n**Try asking:** \"Which roads are most vulnerable?\""
        suggestions = [
            "Which roads are most vulnerable?",
            "Highlight critical bridges",
            "Show hospitals affected by flood",
            "Generate recommendations",
            "Run flood simulation",
            "What is the network health?"
        ]

    return CopilotResponse(reply=reply, actions=actions, suggestions=suggestions)
