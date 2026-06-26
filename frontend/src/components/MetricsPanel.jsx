import React, { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, ShieldAlert, Cpu, Route, Terminal, Map, HeartPulse, Zap } from 'lucide-react';

export default function MetricsPanel({ project, simResults, blockedNodes, simCentralities, healingMetrics, emergencyLocations }) {
  const [alerts, setAlerts] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), msg: 'SYSTEM INITIALIZED. AWAITING TELEMETRY...', type: 'info' }
  ]);

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 glass-panel rounded-2xl border border-brand-border">
        <Activity className="w-12 h-12 mb-3 text-brand-border stroke-1" />
        <p className="text-sm font-medium font-mono">AWAITING SATELLITE UPLINK...</p>
      </div>
    );
  }

  let geojson = null;
  try { geojson = JSON.parse(project.geojson_network); } catch (e) {}

  if (!geojson) return null;

  const nodes = geojson.features.filter(f => f.properties.type === 'junction');
  const edges = geojson.features.filter(f => f.properties.type === 'road');

  // Helpers
  const getNodeCrit = (node) => {
    let crit = node.properties.metrics?.criticality || 0;
    if (simCentralities?.nodes?.[node.properties.id]) {
      crit = simCentralities.nodes[node.properties.id].criticality;
    }
    return crit;
  };
  const getEdgeCrit = (road) => {
    let crit = road.properties.criticality || 0;
    const edgeId = `${road.properties.source}_to_${road.properties.target}`;
    const edgeIdRev = `${road.properties.target}_to_${road.properties.source}`;
    if (simCentralities?.edges?.[edgeId]) crit = simCentralities.edges[edgeId].criticality;
    else if (simCentralities?.edges?.[edgeIdRev]) crit = simCentralities.edges[edgeIdRev].criticality;
    return crit;
  };

  // KPIs
  const networkEfficiency = simResults ? simResults.resilience_score : 100;
  
  let emergencyClosenessSum = 0;
  let emergencyCount = 0;
  if (emergencyLocations) {
    Object.values(emergencyLocations).forEach(locId => {
      if (simCentralities?.nodes?.[locId]) {
        emergencyClosenessSum += simCentralities.nodes[locId].closeness;
        emergencyCount++;
      }
    });
  }
  const emergencyAccess = emergencyCount > 0 ? (emergencyClosenessSum / emergencyCount) * 100 : 95.5;
  
  let avgCloseness = 0;
  nodes.forEach(n => {
    avgCloseness += (simCentralities?.nodes?.[n.properties.id]?.closeness || n.properties.metrics?.closeness || 0);
  });
  avgCloseness = (avgCloseness / nodes.length) * 100;

  const failureRate = simResults ? simResults.connectivity_loss : 0;
  const cityHealthScore = Math.max(0, (0.4 * networkEfficiency) + (0.3 * emergencyAccess) + (0.3 * avgCloseness) - (failureRate * 0.5));
  
  let criticalRoadsCount = 0;
  edges.forEach(e => {
    if (e.properties.is_bridge || getEdgeCrit(e) > 0.8) criticalRoadsCount++;
  });

  const recoveredRoads = healingMetrics ? healingMetrics.recovered_roads : 0;

  // Live Alerts Simulation
  useEffect(() => {
    if (simResults) {
      setAlerts(prev => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), msg: `WARNING: ${simResults.connectivity_loss}% CONNECTIVITY LOSS DETECTED`, type: 'error' },
        ...prev
      ].slice(0, 10));
    }
  }, [simResults]);

  useEffect(() => {
    if (healingMetrics) {
      setAlerts(prev => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), msg: `SUCCESS: RECOVERED ${healingMetrics.recovered_roads} ROADS`, type: 'success' },
        ...prev
      ].slice(0, 10));
    }
  }, [healingMetrics]);

  // Chart Data
  const distData = [
    { name: '0-20', count: 0 }, { name: '21-40', count: 0 }, { name: '41-60', count: 0 }, { name: '61-80', count: 0 }, { name: '81-100', count: 0 }
  ];
  nodes.forEach(n => {
    const c = getNodeCrit(n);
    if (c <= 0.2) distData[0].count++;
    else if (c <= 0.4) distData[1].count++;
    else if (c <= 0.6) distData[2].count++;
    else if (c <= 0.8) distData[3].count++;
    else distData[4].count++;
  });

  // Synthetic Health Trend Data
  const trendData = [
    { time: 'T-5', health: 98 },
    { time: 'T-4', health: 97 },
    { time: 'T-3', health: 98 },
    { time: 'T-2', health: 96 },
    { time: 'T-1', health: 95 },
    { time: 'NOW', health: cityHealthScore.toFixed(1) }
  ];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-4 text-slate-200">
      
      {/* 1. Animated KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Network Efficiency */}
        <div className="glass-panel p-3 rounded-xl border border-brand-border/60 relative overflow-hidden group">
          <div className="absolute inset-0 bg-brand-glow/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Net. Efficiency</span>
            <Activity className="w-3.5 h-3.5 text-brand-glow" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tighter text-brand-glow drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
            {networkEfficiency.toFixed(1)}%
          </div>
        </div>

        {/* City Health Score */}
        <div className="glass-panel p-3 rounded-xl border border-brand-border/60 relative overflow-hidden group">
          <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">City Health</span>
            <HeartPulse className="w-3.5 h-3.5 text-brand-accent" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tighter text-brand-accent drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]">
            {cityHealthScore.toFixed(1)}
          </div>
        </div>

        {/* Critical Roads */}
        <div className="glass-panel p-3 rounded-xl border border-brand-border/60 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Critical Roads</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tighter text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
            {criticalRoadsCount}
          </div>
        </div>

        {/* Emergency Accessibility */}
        <div className="glass-panel p-3 rounded-xl border border-brand-border/60 relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Emerg. Access</span>
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
            {emergencyAccess.toFixed(1)}%
          </div>
        </div>

      </div>

      {/* Recovered Roads Bar (Full Width) */}
      <div className="glass-panel p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest font-mono">Recovered Routes</span>
        </div>
        <div className="text-xl font-black font-mono text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.6)]">
          {recoveredRoads}
        </div>
      </div>

      {/* 2. Professional Charts */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* City Health Trend AreaChart */}
        <div className="glass-panel p-3 rounded-xl border border-brand-border/60">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3 font-mono flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-brand-glow" /> Health Trend (Synthetic)
          </h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2C4D" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 100]} tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0A1325', border: '1px solid #1A2C4D', borderRadius: 4, fontFamily: 'monospace', fontSize: 10 }}
                  itemStyle={{ color: '#00E5FF', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="health" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#colorHealth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Criticality Distribution BarChart */}
        <div className="glass-panel p-3 rounded-xl border border-brand-border/60">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3 font-mono flex items-center gap-1.5">
            <Map className="w-3 h-3 text-brand-accent" /> Criticality Distribution
          </h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2C4D" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0A1325', border: '1px solid #1A2C4D', borderRadius: 4, fontFamily: 'monospace', fontSize: 10 }}
                  itemStyle={{ color: '#FF6B00', fontWeight: 'bold' }}
                  cursor={{ fill: '#1A2C4D', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="#FF6B00" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Live Alerts Terminal */}
      <div className="glass-panel p-3 rounded-xl border border-brand-border flex flex-col mt-1 relative overflow-hidden">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-brand-glow" /> Live Telemetry Log
        </h3>
        <div className="flex-1 bg-[#040B16] rounded border border-[#1A2C4D] p-2 space-y-1.5 overflow-hidden h-28 relative">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#040B16] via-transparent to-[#040B16] z-10 opacity-60"></div>
          
          <div className="flex flex-col gap-1.5 z-0 relative animate-alert-scroll">
            {alerts.map(a => (
              <div key={a.id} className="text-[9px] font-mono leading-tight flex gap-2">
                <span className="text-slate-500">[{a.time}]</span>
                <span className={`${
                  a.type === 'error' ? 'text-red-400' :
                  a.type === 'success' ? 'text-emerald-400' : 'text-brand-glow'
                }`}>
                  {a.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
