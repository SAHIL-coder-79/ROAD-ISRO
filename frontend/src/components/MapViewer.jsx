import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip, ImageOverlay, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to center map when project changes
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function MapViewer({ 
  project, 
  layerConfig, 
  simulationMode,
  blockedNodes,
  onToggleBlockNode,
  simSource,
  simTarget,
  onSelectRouteNode,
  alternateRoute,
  healingStage = 'original',
  healingEdges = [],
  onAnalyzeXai,
  blockedEdges = [],
  simCentralities = null,
  emergencyLocations = null,
  highlightedRoad = null
}) {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
  const [mapBounds, setMapBounds] = useState(null);
  const [nodeComponents, setNodeComponents] = useState({});

  useEffect(() => {
    if (project && project.geojson_network) {
      try {
        const parsed = JSON.parse(project.geojson_network);
        setGeoJsonData(parsed);

        // Find bounds of the project coordinates
        const lats = [];
        const lons = [];
        parsed.features.forEach(f => {
          if (f.geometry.type === 'Point') {
            const [lon, lat] = f.geometry.coordinates;
            lats.push(lat);
            lons.push(lon);
          }
        });

        if (lats.length > 0) {
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          
          const center = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
          setMapCenter(center);
          
          // Set slightly padded bounds for image overlays
          setMapBounds([
            [minLat - 0.001, minLon - 0.001],
            [maxLat + 0.001, maxLon + 0.001]
          ]);
        }
      } catch (err) {
        console.error('Failed to parse GeoJSON network:', err);
      }
    } else {
      setGeoJsonData(null);
      setMapBounds(null);
    }
  }, [project]);

  // Analyze connected components on the client side
  useEffect(() => {
    if (!geoJsonData) {
      setNodeComponents({});
      return;
    }

    const junctionsList = geoJsonData.features.filter(f => f.properties.type === 'junction');
    const roadsList = geoJsonData.features.filter(f => f.properties.type === 'road');

    // Build adjacency list
    const adj = {};
    junctionsList.forEach(j => {
      adj[j.properties.id] = [];
    });

    roadsList.forEach(r => {
      const u = r.properties.source;
      const v = r.properties.target;
      const isBlocked = blockedNodes.includes(u) || blockedNodes.includes(v);
      if (!isBlocked && adj[u] && adj[v]) {
        adj[u].push(v);
        adj[v].push(u);
      }
    });

    // Simple BFS/DFS to identify components
    const visited = {};
    const comps = {};
    let compId = 0;

    Object.keys(adj).forEach(node => {
      if (!visited[node] && !blockedNodes.includes(node)) {
        const queue = [node];
        visited[node] = true;
        while (queue.length > 0) {
          const curr = queue.shift();
          comps[curr] = compId;
          (adj[curr] || []).forEach(neighbor => {
            if (!visited[neighbor]) {
              visited[neighbor] = true;
              queue.push(neighbor);
            }
          });
        }
        compId++;
      }
    });

    setNodeComponents(comps);
  }, [geoJsonData, blockedNodes]);

  // Color mapper based on centrality
  const getCentralityColor = (val, type = 'closeness') => {
    if (val < 0.25) return '#4F46E5'; // low (Indigo)
    if (val < 0.5) return '#10B981'; // medium (Emerald)
    if (val < 0.75) return '#F59E0B'; // high (Orange)
    return '#EF4444'; // critical (Red)
  };

  const getWeight = (val) => {
    return Math.max(3, Math.min(8, val * 6 + 3));
  };

  const componentColors = ['#06B6D4', '#F97316', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6', '#F43F5E', '#10B981'];

  const getElementStyle = (id, defaultColor, opacity = 0.8) => {
    if (healingStage === 'original') {
      return { color: '#64748B', opacity: 0.3 };
    }
    if (healingStage === 'broken' || healingStage === 'healing') {
      const compId = nodeComponents[id];
      if (compId !== undefined) {
        return { color: componentColors[compId % componentColors.length], opacity: opacity };
      }
    }
    if (healingStage === 'connected') {
      return { color: '#10B981', opacity: 0.9 };
    }
    return { color: defaultColor, opacity: opacity };
  };

  const getRoadStyle = (road, criticality, u, v) => {
    // Check if edge is explicitly blocked in blockedEdges
    const isEdgeBlocked = blockedEdges.some(e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));
    const isBlocked = blockedNodes.includes(u) || blockedNodes.includes(v) || isEdgeBlocked;
    const isHighlighted = highlightedRoad === `${u} ↔ ${v}` || highlightedRoad === `${v} ↔ ${u}`;
    
    if (isBlocked) {
      return { color: '#EF4444', opacity: 0.2, dashArray: '5, 5', weight: getWeight(criticality) };
    }
    
    if (isHighlighted) {
      return { color: '#38bdf8', opacity: 1, dashArray: null, weight: getWeight(criticality) + 4 };
    }
    
    const defaultColor = getCentralityColor(criticality);
    const style = getElementStyle(road.properties.source, defaultColor, 0.85);
    return {
      color: style.color,
      opacity: style.opacity,
      dashArray: null,
      weight: getWeight(criticality)
    };
  };

  // Node rendering
  const junctions = geoJsonData?.features.filter(f => f.properties.type === 'junction') || [];
  
  // Roads rendering
  const roads = geoJsonData?.features.filter(f => f.properties.type === 'road') || [];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-brand-border shadow-2xl bg-brand-dark">
      <MapContainer 
        center={mapCenter} 
        zoom={16} 
        className="w-full h-full"
        zoomControl={true}
      >
        <MapRecenter center={mapCenter} />
        
        {/* CartoDB Dark Matter Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 1. Original satellite image overlay */}
        {project && mapBounds && layerConfig.original && (
          <ImageOverlay
            url={project.original_image}
            bounds={mapBounds}
            opacity={0.85}
          />
        )}

        {/* 2. AI segmented road mask overlay */}
        {project && mapBounds && layerConfig.segmentation && (
          <ImageOverlay
            url={project.segmentation_mask}
            bounds={mapBounds}
            opacity={layerConfig.original ? 0.6 : 0.85}
          />
        )}

        {/* 3. Road Network Edges */}
        {layerConfig.network && roads.map((road, idx) => {
          const u = road.properties.source;
          const v = road.properties.target;
          
          let criticality = road.properties.criticality || 0.5;
          let betweenness = road.properties.betweenness || 0.0;
          let is_bridge = road.properties.is_bridge;

          if (simCentralities && simCentralities.edges) {
            const edge_metrics = simCentralities.edges[`${u}_to_${v}`] || simCentralities.edges[`${v}_to_${u}`];
            if (edge_metrics) {
              criticality = edge_metrics.criticality;
              betweenness = edge_metrics.betweenness;
              is_bridge = edge_metrics.is_bridge;
            }
          }

          const coords = road.geometry.coordinates.map(pt => [pt[1], pt[0]]);
          const roadStyle = getRoadStyle(road, criticality, u, v);

          return (
            <Polyline
              key={`road-${idx}`}
              positions={coords}
              className="animated-path"
              pathOptions={{
                color: roadStyle.color,
                weight: roadStyle.weight,
                opacity: roadStyle.opacity,
                dashArray: roadStyle.dashArray
              }}
            >
              <Popup>
                <div className="bg-brand-card text-slate-100 p-2.5 rounded-lg border border-brand-border max-w-xs text-xs">
                  <h4 className="font-bold text-xs text-amber-400 uppercase mb-1 flex items-center gap-1">
                    <span>Road Metrics</span>
                    {is_bridge && (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase ml-auto animate-pulse">
                        Critical Bridge
                      </span>
                    )}
                  </h4>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Source:</span>
                      <span className="font-mono text-[10px] text-slate-200 truncate max-w-[120px]">{road.properties.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-mono text-[10px] text-slate-200 truncate max-w-[120px]">{road.properties.target}</span>
                    </div>
                    <div className="flex justify-between border-t border-brand-border/40 pt-1">
                      <span className="text-slate-400">Length (Weight):</span>
                      <span className="font-mono text-slate-200">{road.properties.weight?.toFixed(1) || '1.0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Betweenness:</span>
                      <span className="font-mono text-slate-200">{betweenness?.toFixed(3) || '0.000'}</span>
                    </div>
                    <div className="flex justify-between border-t border-brand-border pt-1 font-semibold text-brand-glow">
                      <span>Critical Edge Score:</span>
                      <span className="font-mono text-brand-glow">{(criticality * 100).toFixed(0)}%</span>
                    </div>
                    {onAnalyzeXai && (
                      <div className="mt-2 pt-2 border-t border-brand-border">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzeXai(road);
                          }}
                          className="w-full py-1.5 text-[10px] bg-brand-glow/20 hover:bg-brand-glow/40 text-brand-glow border border-brand-glow/50 rounded font-medium transition flex items-center justify-center gap-1"
                        >
                          🔬 Analyze AI Decision
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 4. Alternate path rendering */}
        {layerConfig.network && alternateRoute && alternateRoute.length > 0 && (
          <Polyline
            positions={alternateRoute}
            className="reroute-animated"
            pathOptions={{
              color: '#3B82F6', // Blue path for route
              weight: 6,
              opacity: 0.95,
              dashArray: '2, 8',
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {/* 5. Healing Edges Rendering */}
        {layerConfig.network && (healingStage === 'healing' || healingStage === 'connected') && healingEdges.map((edge, idx) => {
          return (
            <Polyline
              key={`healing-edge-${idx}`}
              positions={edge.geo_path}
              className={healingStage === 'healing' ? 'healing-path-pulse' : ''}
              pathOptions={{
                color: healingStage === 'healing' ? '#38BDF8' : '#10B981',
                weight: 5,
                opacity: healingStage === 'healing' ? 0.85 : 0.95,
                dashArray: healingStage === 'healing' ? '8, 8' : null
              }}
            />
          );
        })}

        {/* 6. Junctions/Nodes Markers */}
        {layerConfig.network && junctions.map((junction) => {
          const id = junction.properties.id;
          const [lon, lat] = junction.geometry.coordinates;
          const isBlocked = blockedNodes.includes(id);
          
          let criticality = junction.properties.metrics?.criticality || 0.0;
          let degree = junction.properties.metrics?.degree || 0.0;
          let closeness = junction.properties.metrics?.closeness || 0.0;
          let betweenness = junction.properties.metrics?.betweenness || 0.0;
          let isArticulation = junction.properties.metrics?.is_articulation_point;

          if (simCentralities && simCentralities.nodes && simCentralities.nodes[id]) {
            const m = simCentralities.nodes[id];
            criticality = m.criticality;
            degree = m.degree;
            closeness = m.closeness;
            betweenness = m.betweenness;
            isArticulation = m.is_articulation_point;
          }
          
          let radius = 6;
          let color = getCentralityColor(criticality);
          let fillOpacity = 0.85;
          let weight = 1.5;
          let borderColor = '#FFFFFF';
          
          let emergencyRole = null;
          if (emergencyLocations) {
            if (id === emergencyLocations.hospital) emergencyRole = { label: '🏥 Hospital', color: '#EF4444' };
            else if (id === emergencyLocations.police) emergencyRole = { label: '🚓 Police', color: '#3B82F6' };
            else if (id === emergencyLocations.fire_station) emergencyRole = { label: '🚒 Fire Station', color: '#F97316' };
            else if (id === emergencyLocations.school) emergencyRole = { label: '🏫 School', color: '#FBBF24' };
          }

          if (isBlocked) {
            color = '#EF4444';
            radius = 8;
            borderColor = '#B91C1C';
          } else if (simSource === id) {
            color = '#3B82F6';
            radius = 10;
          } else if (simTarget === id) {
            color = '#8B5CF6';
            radius = 10;
          } else if (emergencyRole) {
            color = emergencyRole.color;
            radius = 9;
            borderColor = '#FFFFFF';
            weight = 2.5;
          } else {
            const style = getElementStyle(id, color, 0.9);
            color = style.color;
            fillOpacity = style.opacity;
            if (isArticulation && healingStage !== 'original') {
              borderColor = '#EF4444'; // Red border for Articulation points
              weight = 3.0;
            }
          }

          // Risk Heatmap Calculation
          // 40% criticality, 30% road usage (betweenness), 30% isolation risk (1 - closeness)
          const riskScore = (criticality * 0.4) + (betweenness * 0.3) + ((1.0 - closeness) * 0.3);
          let riskColor = '#10B981'; // Green
          if (riskScore > 0.6) riskColor = '#EF4444'; // Red
          else if (riskScore > 0.4) riskColor = '#F97316'; // Orange
          else if (riskScore > 0.25) riskColor = '#FBBF24'; // Yellow

          return (
            <React.Fragment key={id}>
              {layerConfig.riskHeatmap && (
                <CircleMarker
                  center={[lat, lon]}
                  radius={28}
                  className="animated-path"
                  pathOptions={{
                    fillColor: riskColor,
                    fillOpacity: 0.35,
                    stroke: false,
                  }}
                  interactive={true}
                >
                  <Tooltip sticky className="custom-tooltip">
                    <div className="bg-brand-dark text-slate-100 p-1.5 rounded border border-brand-border text-xs min-w-[150px]">
                      <div className="font-bold mb-1 border-b border-brand-border pb-1" style={{color: riskColor}}>
                        Urban Risk: {(riskScore * 100).toFixed(1)}%
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Criticality:</span> 
                        <span className="font-mono">{(criticality * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Road Usage:</span> 
                        <span className="font-mono">{(betweenness * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Isolation Risk:</span> 
                        <span className="font-mono">{((1.0 - closeness) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              )}

              <CircleMarker
                center={[lat, lon]}
              radius={radius}
              className="animated-path"
              pathOptions={{
                fillColor: color,
                fillOpacity: fillOpacity,
                color: borderColor,
                weight: weight,
              }}
              eventHandlers={{
                click: () => {
                  if (simulationMode) {
                    onToggleBlockNode(id);
                  }
                }
              }}
            >
              <Popup>
                <div className="bg-brand-card text-slate-100 p-2 rounded-lg border border-brand-border max-w-xs">
                  <h4 className="font-bold text-xs text-brand-glow uppercase mb-1 flex items-center gap-1">
                    <span>Junction Details</span>
                    {emergencyRole && (
                      <span className="bg-brand-dark border border-brand-border px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider ml-auto">
                        {emergencyRole.label}
                      </span>
                    )}
                    {isArticulation && !emergencyRole && (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase ml-auto">
                        Articulation Point
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400 mb-2 font-mono">{id}</p>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Degree Centrality:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {degree.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Closeness Centrality:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {closeness.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Betweenness:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {betweenness.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-brand-border pt-1 font-semibold text-brand-glow">
                      <span>Criticality Score:</span>
                      <span className="font-mono">
                        {(criticality * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {!simulationMode ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onSelectRouteNode('source', id)}
                        className="flex-1 py-1 text-[10px] bg-brand-accent/80 hover:bg-brand-accent text-white rounded font-medium transition"
                      >
                        Set Source
                      </button>
                      <button
                        onClick={() => onSelectRouteNode('target', id)}
                        className="flex-1 py-1 text-[10px] bg-purple-600/80 hover:bg-purple-600 text-white rounded font-medium transition"
                      >
                        Set Target
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] text-amber-400 font-medium text-center">
                      Click node to {isBlocked ? 'unblock' : 'block'} in simulation
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating map controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 glass-panel p-3 rounded-xl">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-brand-border pb-1">Layers</h4>
        <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-brand-glow transition">
          <input 
            type="checkbox" 
            checked={layerConfig.original} 
            onChange={() => layerConfig.onChange('original')} 
            className="accent-brand-glow"
          />
          Satellite Imagery
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-brand-glow transition">
          <input 
            type="checkbox" 
            checked={layerConfig.segmentation} 
            onChange={() => layerConfig.onChange('segmentation')}
            className="accent-brand-glow"
          />
          AI Road Mask
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-brand-glow transition">
          <input 
            type="checkbox" 
            checked={layerConfig.network} 
            onChange={() => layerConfig.onChange('network')}
            className="accent-brand-glow"
          />
          Graph Network
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-red-400 transition mt-2 border-t border-brand-border/50 pt-2">
          <input 
            type="checkbox" 
            checked={layerConfig.riskHeatmap} 
            onChange={() => layerConfig.onChange('riskHeatmap')}
            className="accent-red-500"
          />
          Urban Risk Heatmap
        </label>
      </div>
    </div>
  );
}
