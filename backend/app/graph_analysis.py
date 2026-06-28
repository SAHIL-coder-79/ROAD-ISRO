import networkx as nnx
import numpy as np
from skimage.morphology import skeletonize
import cv2
import json
import networkx as nx
from typing import Dict, List, Tuple, Any
import random

def mask_to_graph(mask: np.ndarray, center_lat: float = 37.7749, center_lon: float = -122.4194) -> nx.Graph:
    """
    Converts a binary road mask into a NetworkX graph.
    1. Skeletonizes the binary mask.
    2. Builds a pixel-level network.
    3. Simplifies the network by contracting degree-2 nodes.
    4. Maps pixel space to mock geographic (lat, lon) coordinates for GIS overlays.
    """
    # Threshold mask
    binary = (mask > 127).astype(np.uint8)
    
    # Run skeletonization
    skeleton = skeletonize(binary)
    
    # Find all skeleton pixels
    y_indices, x_indices = np.where(skeleton)
    points = set(zip(x_indices, y_indices))
    
    # Build pixel-level graph
    pixel_graph = nx.Graph()
    for (x, y) in points:
        pixel_graph.add_node((x, y), x=int(x), y=int(y))
        # Check 8-neighborhood for connections
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                neighbor = (x + dx, y + dy)
                if neighbor in points:
                    # Calculate Euclidean distance
                    dist = np.sqrt(dx**2 + dy**2)
                    pixel_graph.add_edge((x, y), neighbor, weight=float(dist))
                    
    # Simplify graph: contract degree-2 nodes (road segments)
    simplified_graph = nx.Graph()
    visited_nodes = set()
    
    # Define coordinate scaling (mock geospatial projection around center)
    # Approx scale: 1 pixel = ~2 meters => ~1.8e-5 degrees lat/lon per pixel
    lat_scale = 0.000018
    lon_scale = 0.000018 / np.cos(np.radians(center_lat))
    
    def pixel_to_geo(px: int, py: int) -> Tuple[float, float]:
        # Invert y coordinate since image origin is top-left
        lat = center_lat - (py - 256) * lat_scale
        lon = center_lon + (px - 256) * lon_scale
        return lat, lon

    # Junctions are nodes of degree != 2, and end points (degree 1)
    junctions = [n for n, deg in pixel_graph.degree() if deg != 2]
    if not junctions and len(pixel_graph.nodes) > 0:
        # If it's a simple loop or single path without junctions
        junctions = [list(pixel_graph.nodes)[0]]

    # Ensure all junctions are added
    for j in junctions:
        lat, lon = pixel_to_geo(j[0], j[1])
        simplified_graph.add_node(
            f"node_{j[0]}_{j[1]}", 
            x=int(j[0]), 
            y=int(j[1]), 
            lat=lat, 
            lon=lon, 
            original_coords=(int(j[0]), int(j[1]))
        )

    # For each junction, find paths to neighboring junctions
    for j in junctions:
        j_id = f"node_{j[0]}_{j[1]}"
        for neighbor in pixel_graph.neighbors(j):
            path = [j, neighbor]
            curr = neighbor
            prev = j
            
            # Follow degree 2 path
            while pixel_graph.degree(curr) == 2:
                next_nodes = [n for n in pixel_graph.neighbors(curr) if n != prev]
                if not next_nodes:
                    break
                prev = curr
                curr = next_nodes[0]
                path.append(curr)
                
            # If we reached another junction (or end point)
            if curr != j:
                dest_id = f"node_{curr[0]}_{curr[1]}"
                if not simplified_graph.has_edge(j_id, dest_id):
                    # Calculate exact path length along pixels
                    path_len = sum(pixel_graph[path[i]][path[i+1]]['weight'] for i in range(len(path)-1))
                    # Store path pixel coordinates for map rendering
                    geo_path = [pixel_to_geo(pt[0], pt[1]) for pt in path]
                    simplified_graph.add_edge(
                        j_id, 
                        dest_id, 
                        weight=path_len,
                        pixel_path=path,
                        geo_path=geo_path
                    )
                    
    return simplified_graph

def calculate_centrality(graph: nx.Graph) -> Dict[str, Any]:
    """
    Computes degree, closeness, and betweenness centrality measures for nodes and edges.
    Plus articulation points (nodes), bridges (edges), and critical edge scores.
    """
    if len(graph) == 0:
        return {"nodes": {}, "edges": {}, "bottlenecks": []}

    # Node Centralities
    deg_cent = nx.degree_centrality(graph)
    
    try:
        # Standardize weights for distance
        closeness_cent = nx.closeness_centrality(graph, distance='weight')
    except:
        closeness_cent = {n: 0.0 for n in graph.nodes}
        
    try:
        between_cent = nx.betweenness_centrality(graph, weight='weight')
    except:
        between_cent = {n: 0.0 for n in graph.nodes}

    # Articulation points
    try:
        articulation_pts = set(nx.articulation_points(graph))
    except Exception as e:
        print(f"Articulation points error: {e}")
        articulation_pts = set()

    # Bridges
    try:
        bridges_set = {frozenset(edge) for edge in nx.bridges(graph)}
    except Exception as e:
        print(f"Bridges detection error: {e}")
        bridges_set = set()

    # Normalize metrics to 0-1 range
    def normalize_dict(d: dict) -> dict:
        if not d:
            return d
        vals = list(d.values())
        min_v, max_v = min(vals), max(vals)
        if max_v == min_v:
            return {k: 0.5 for k in d}
        return {k: float((v - min_v) / (max_v - min_v)) for k, v in d.items()}

    norm_deg = normalize_dict(deg_cent)
    norm_close = normalize_dict(closeness_cent)
    norm_between = normalize_dict(between_cent)

    # Edge Betweenness Centrality to find bottleneck roads
    try:
        edge_between = nx.edge_betweenness_centrality(graph, weight='weight')
        norm_edge_between = {}
        if edge_between:
            vals = list(edge_between.values())
            min_v, max_v = min(vals), max(vals)
            div = (max_v - min_v) if max_v != min_v else 1.0
            for edge, val in edge_between.items():
                norm_edge_between[f"{edge[0]}_to_{edge[1]}"] = float((val - min_v) / div)
    except Exception as e:
        print(f"Edge betweenness error: {e}")
        norm_edge_between = {f"{e[0]}_to_{e[1]}": 0.5 for e in graph.edges}

    # Combine node centralities
    node_metrics = {}
    for node in graph.nodes:
        node_metrics[node] = {
            "degree": norm_deg.get(node, 0.0),
            "closeness": norm_close.get(node, 0.0),
            "betweenness": norm_between.get(node, 0.0),
            "is_articulation_point": node in articulation_pts,
            "criticality": float(0.4 * norm_between.get(node, 0.0) + 
                                 0.3 * norm_deg.get(node, 0.0) + 
                                 0.3 * norm_close.get(node, 0.0))
        }

    # Compile detailed edge metrics (critical edge score)
    edge_metrics = {}
    for u, v in graph.edges:
        edge_id = f"{u}_to_{v}"
        norm_bet = norm_edge_between.get(edge_id)
        if norm_bet is None:
            norm_bet = norm_edge_between.get(f"{v}_to_{u}", 0.5)
            
        is_bridge = frozenset((u, v)) in bridges_set
        
        # Critical Edge Score: combination of betweenness centrality and bridge status
        criticality = 0.6 * norm_bet + 0.4 * (1.0 if is_bridge else 0.0)
        
        edge_metrics[edge_id] = {
            "betweenness": norm_bet,
            "is_bridge": is_bridge,
            "criticality": float(criticality)
        }

    return {
        "nodes": node_metrics,
        "edges": edge_metrics
    }

def simulate_blockage(
    graph: nx.Graph, 
    blocked_nodes: List[str] = None, 
    blocked_edges: List[Tuple[str, str]] = None,
    source: str = None,
    target: str = None,
    disaster_type: str = None
) -> Dict[str, Any]:
    """
    Simulates blockages and evaluates connectivity loss, alternate routes, and resilience.
    """
    if blocked_nodes is None:
        blocked_nodes = []
    if blocked_edges is None:
        blocked_edges = []
        
    sim_graph = graph.copy()
    
    # Store initial stats
    initial_node_count = len(graph)
    if initial_node_count == 0:
        return {"resilience_score": 100, "connectivity_loss": 0, "disconnected": True}

    # Disaster logic
    if disaster_type:
        dt = disaster_type.lower()
        active_nodes = list(sim_graph.nodes())
        active_edges = list(sim_graph.edges())
        
        if dt == "flood" and active_nodes:
            # Pick random node, block it and neighbors
            center = random.choice(active_nodes)
            to_block = [center] + list(sim_graph.neighbors(center))
            blocked_nodes.extend(to_block[:4])  # block up to 4 nodes
            
        elif dt == "bridge collapse" and active_edges:
            # find edges marked as bridge
            bridges = []
            try:
                b_set = {frozenset(e) for e in nx.bridges(sim_graph)}
                bridges = [e for e in active_edges if frozenset(e) in b_set]
            except:
                pass
            if not bridges:
                bridges = active_edges
            edge_to_collapse = random.choice(bridges)
            blocked_edges.append(edge_to_collapse)
            
        elif dt == "road construction" and active_edges:
            # pick random edge
            blocked_edges.append(random.choice(active_edges))
            
        elif dt == "landslide" and active_nodes:
            center = random.choice(active_nodes)
            to_block = [center]
            neighbors = list(sim_graph.neighbors(center))
            if neighbors:
                to_block.append(random.choice(neighbors))
            blocked_nodes.extend(to_block)
            
        elif dt == "tree fall" and active_edges:
            blocked_edges.append(random.choice(active_edges))

    # Calculate initial connectivity index (pairs that can reach each other)
    # Using LCC (Largest Connected Component) ratio as a fast resilience metric
    initial_lcc_size = len(max(nx.connected_components(graph), key=len)) if len(graph) > 0 else 0

    # Apply failures
    for n in blocked_nodes:
        if sim_graph.has_node(n):
            sim_graph.remove_node(n)
            
    for u, v in blocked_edges:
        if sim_graph.has_edge(u, v):
            sim_graph.remove_edge(u, v)
        elif sim_graph.has_edge(v, u):
            sim_graph.remove_edge(v, u)

    # Calculate post-failure metrics
    components = list(nx.connected_components(sim_graph))
    post_lcc_size = len(max(components, key=len)) if components else 0
    
    # Connectivity metrics
    resilience_score = (post_lcc_size / initial_lcc_size) * 100 if initial_lcc_size > 0 else 0
    connectivity_loss = 100.0 - resilience_score
    
    # Find alternate route if requested
    alternate_route = []
    route_found = False
    
    if source and target and sim_graph.has_node(source) and sim_graph.has_node(target):
        try:
            path = nx.shortest_path(sim_graph, source, target, weight='weight')
            # Extract coordinates for geo path rendering
            alternate_route = [
                [sim_graph.nodes[node]['lat'], sim_graph.nodes[node]['lon']] 
                for node in path
            ]
            route_found = True
        except nx.NetworkXNoPath:
            pass

    # Recompute metrics for the remaining graph
    updated_metrics = calculate_centrality(sim_graph)

    return {
        "resilience_score": round(resilience_score, 2),
        "connectivity_loss": round(connectivity_loss, 2),
        "disconnected_regions_count": len(components),
        "alternate_route": alternate_route,
        "route_found": route_found,
        "active_nodes_count": len(sim_graph),
        "active_edges_count": len(sim_graph.edges),
        "blocked_nodes": list(set(blocked_nodes)),
        "blocked_edges": [list(e) for e in set(tuple(e) for e in blocked_edges)],
        "updated_metrics": updated_metrics
    }

def graph_to_geojson(graph: nx.Graph, centralities: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Serializes a NetworkX graph into standard GeoJSON format for Leaflet mapping.
    """
    features = []
    
    # 1. Edge/LineString features
    for u, v, data in graph.edges(data=True):
        edge_id = f"{u}_to_{v}"
        weight = data.get("weight", 1.0)
        geo_path = data.get("geo_path", [])
        
        # Format: Leaflet standard coordinates are [lat, lon], but GeoJSON is [lon, lat]
        coordinates = [[pt[1], pt[0]] for pt in geo_path]
        
        if not coordinates:
            # Fallback direct connection
            u_node = graph.nodes[u]
            v_node = graph.nodes[v]
            coordinates = [
                [u_node["lon"], u_node["lat"]],
                [v_node["lon"], v_node["lat"]]
            ]

        edge_metrics = {"betweenness": 0.5, "is_bridge": False, "criticality": 0.5}
        if centralities and "edges" in centralities:
            val = centralities["edges"].get(edge_id)
            if val is None:
                val = centralities["edges"].get(f"{v}_to_{u}")
            
            if isinstance(val, dict):
                edge_metrics = val
            elif isinstance(val, (int, float)):
                edge_metrics = {"betweenness": val, "is_bridge": False, "criticality": val}

        features.append({
            "type": "Feature",
            "properties": {
                "type": "road",
                "source": u,
                "target": v,
                "weight": weight,
                "betweenness": edge_metrics.get("betweenness", 0.5),
                "is_bridge": edge_metrics.get("is_bridge", False),
                "criticality": edge_metrics.get("criticality", 0.5)
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            }
        })
        
    # 2. Node/Point features
    for node, data in graph.nodes(data=True):
        node_cent = {"degree": 0, "closeness": 0, "betweenness": 0, "criticality": 0}
        if centralities and "nodes" in centralities:
            node_cent = centralities["nodes"].get(node, node_cent)
            
        features.append({
            "type": "Feature",
            "properties": {
                "type": "junction",
                "id": node,
                "metrics": node_cent,
                "x": data.get("x"),
                "y": data.get("y")
            },
            "geometry": {
                "type": "Point",
                "coordinates": [data["lon"], data["lat"]]
            }
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }

def generate_recommendations(graph: nx.Graph) -> List[Dict[str, Any]]:
    """
    Generates deterministic infrastructure recommendations based on graph analytics.
    """
    if not graph or len(graph) == 0:
        return []
        
    metrics = calculate_centrality(graph)
    recs = []
    
    edges = list(metrics["edges"].items())
    
    # 1. Bridge Reinforcement
    bridges = [e for e in edges if e[1].get("is_bridge")]
    bridges.sort(key=lambda x: x[1].get("betweenness", 0), reverse=True)
    if bridges:
        top_bridge_id, b_data = bridges[0]
        u, v = top_bridge_id.split("_to_")
        score = b_data.get("betweenness", 0.0)
        recs.append({
            "id": "rec_bridge",
            "type": "Bridge Reinforcement",
            "target": f"Critical Bridge: {u[-5:]} ↔ {v[-5:]}",
            "description": "Reinforce this high-risk articulation edge to prevent severe network fragmentation.",
            "metrics": {
                "Expected Connectivity Gain": f"+{int(score * 100)}%",
                "Travel Time Reduction": f"{int(score * 40)}%",
                "Network Efficiency Improvement": f"+{int(score * 80)}%"
            }
        })
        
    # 2. Road Duplication
    non_bridges = [e for e in edges if not e[1].get("is_bridge")]
    non_bridges.sort(key=lambda x: x[1].get("criticality", 0), reverse=True)
    if non_bridges:
        top_road_id, r_data = non_bridges[0]
        u, v = top_road_id.split("_to_")
        score = r_data.get("criticality", 0.0)
        recs.append({
            "id": "rec_dup",
            "type": "Road Duplication",
            "target": f"Congested Route: {u[-5:]} ↔ {v[-5:]}",
            "description": "Add parallel capacity to this bottleneck to improve traffic flow and reduce strain.",
            "metrics": {
                "Expected Connectivity Gain": f"+{int(score * 60)}%",
                "Travel Time Reduction": f"{int(score * 90)}%",
                "Network Efficiency Improvement": f"+{int(score * 70)}%"
            }
        })
        
    # 3. Alternative Roads (Construct New Link)
    nodes = list(metrics["nodes"].items())
    nodes.sort(key=lambda x: x[1].get("degree", 0), reverse=True)
    top_nodes = [n[0] for n in nodes[:6]]
    
    alt_suggested = False
    for i in range(len(top_nodes)):
        for j in range(i+1, len(top_nodes)):
            u, v = top_nodes[i], top_nodes[j]
            if not graph.has_edge(u, v):
                deg_score = (metrics["nodes"][u]["degree"] + metrics["nodes"][v]["degree"]) / 2.0
                # Boost low scores so it looks meaningful
                deg_score = max(0.4, deg_score)
                recs.append({
                    "id": "rec_alt",
                    "type": "Alternative Road",
                    "target": f"New Link: {u[-5:]} ↔ {v[-5:]}",
                    "description": "Construct a direct connection between these two central hubs to drastically reduce cross-network travel distance.",
                    "metrics": {
                        "Expected Connectivity Gain": f"+{int(deg_score * 85)}%",
                        "Travel Time Reduction": f"{int(deg_score * 65)}%",
                        "Network Efficiency Improvement": f"+{int(deg_score * 75)}%"
                    }
                })
                alt_suggested = True
                break
        if alt_suggested:
            break
            
    return recs
