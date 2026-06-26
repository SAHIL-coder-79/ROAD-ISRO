import React, { useState, useEffect } from 'react';
import { HeartPulse, CheckCircle2, AlertCircle, RefreshCw, Layers, Zap, Info } from 'lucide-react';

export default function HealingPanel({
  project,
  blockedNodes,
  healingStage,
  setHealingStage,
  healingMetrics,
  onStartHealing,
  onResetHealing,
  isHealing
}) {
  const [animatedMetrics, setAnimatedMetrics] = useState({
    recovered_roads: 0,
    connectivity_increase: 0,
    recovered_length: 0,
    recovered_intersections: 0
  });

  useEffect(() => {
    if (healingStage === 'connected' && healingMetrics) {
      // Animate counting up metrics
      const duration = 1200; // ms
      const steps = 30;
      const stepTime = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        setAnimatedMetrics({
          recovered_roads: Math.min(healingMetrics.recovered_roads, Math.round((healingMetrics.recovered_roads / steps) * step)),
          connectivity_increase: Number(Math.min(healingMetrics.connectivity_increase, (healingMetrics.connectivity_increase / steps) * step).toFixed(1)),
          recovered_length: Number(Math.min(healingMetrics.recovered_length, (healingMetrics.recovered_length / steps) * step).toFixed(1)),
          recovered_intersections: Math.min(healingMetrics.recovered_intersections, Math.round((healingMetrics.recovered_intersections / steps) * step))
        });

        if (step >= steps) {
          clearInterval(timer);
          setAnimatedMetrics(healingMetrics);
        }
      }, stepTime);

      return () => clearInterval(timer);
    } else {
      setAnimatedMetrics({
        recovered_roads: 0,
        connectivity_increase: 0,
        recovered_length: 0,
        recovered_intersections: 0
      });
    }
  }, [healingStage, healingMetrics]);

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 glass-panel rounded-2xl border border-brand-border">
        <HeartPulse className="w-12 h-12 mb-3 text-brand-border stroke-1" />
        <p className="text-sm font-medium">Select or upload a project to see healing options</p>
      </div>
    );
  }

  const stages = [
    { key: 'original', label: 'Original', desc: 'Baseline intact/extracted view' },
    { key: 'broken', label: 'Broken', desc: 'Identified gaps & blockages' },
    { key: 'healing', label: 'Healing', desc: 'Simulating reconnection pathways' },
    { key: 'connected', label: 'Connected', desc: 'Repaired graph network metrics' }
  ];

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* 1. Stage Sequence Viewer */}
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Healing Progression Stages</h3>
        
        <div className="relative flex justify-between items-center px-2 py-4 bg-brand-dark/40 rounded-xl border border-brand-border/40">
          {/* Connector line */}
          <div className="absolute left-[10%] right-[10%] top-[40%] h-[2px] bg-brand-border -translate-y-1/2 z-0">
            <div 
              className="h-full bg-brand-glow transition-all duration-500" 
              style={{ 
                width: healingStage === 'original' ? '0%' : 
                       healingStage === 'broken' ? '33%' : 
                       healingStage === 'healing' ? '66%' : '100%' 
              }}
            />
          </div>

          {stages.map((st, idx) => {
            const isActive = healingStage === st.key;
            const isCompleted = idx < stages.findIndex(s => s.key === healingStage);
            
            return (
              <div key={st.key} className="flex flex-col items-center z-10 relative group">
                <button
                  disabled={isHealing}
                  onClick={() => setHealingStage(st.key)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                    isActive 
                      ? 'bg-brand-glow text-brand-dark border-brand-glow glow-shadow font-bold' 
                      : isCompleted
                      ? 'bg-brand-card text-brand-glow border-brand-glow'
                      : 'bg-brand-card text-slate-400 border-brand-border hover:border-slate-400'
                  }`}
                >
                  {idx + 1}
                </button>
                <span className={`text-[10px] font-semibold mt-1.5 transition ${isActive ? 'text-brand-glow' : 'text-slate-400'}`}>
                  {st.label}
                </span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block w-36 bg-slate-900 border border-brand-border p-2 rounded-lg text-[9px] text-slate-300 text-center leading-normal shadow-xl">
                  {st.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Simulation Controller */}
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Simulation Controller</h3>
        
        <div className="space-y-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Detect isolated road segments (components) in the extracted network (including simulated blockages), and execute topological path-healing to reconstruct flow.
          </p>

          <div className="flex gap-2">
            <button
              onClick={onResetHealing}
              disabled={isHealing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-card hover:bg-brand-border text-slate-300 rounded-xl border border-brand-border transition text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Stage
            </button>
            <button
              onClick={onStartHealing}
              disabled={isHealing}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-brand-glow text-brand-dark hover:bg-emerald-400 rounded-xl transition text-xs font-extrabold shadow-lg disabled:opacity-50"
            >
              <HeartPulse className={`w-4 h-4 ${isHealing ? 'animate-bounce' : ''}`} />
              {isHealing ? 'Healing Network...' : 'Execute Road Healing'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Recovery Metrics */}
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Healed Network Metrics</h3>
          <span className="text-[9px] font-mono text-slate-500 bg-brand-dark/50 px-2 py-0.5 rounded border border-brand-border/40">Real-time stats</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Recovered Roads */}
          <div className="bg-brand-dark/45 p-3 rounded-xl border border-brand-border/50 flex flex-col justify-between h-20">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovered Roads</span>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold font-mono text-brand-glow">
                {animatedMetrics.recovered_roads}
              </span>
              <span className="text-[9px] text-slate-500">connections</span>
            </div>
          </div>

          {/* Connectivity Increase */}
          <div className="bg-brand-dark/45 p-3 rounded-xl border border-brand-border/50 flex flex-col justify-between h-20">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Conn. Increase</span>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                +{animatedMetrics.connectivity_increase}%
              </span>
              <span className="text-[9px] text-slate-500">efficiency</span>
            </div>
          </div>

          {/* Recovered Length */}
          <div className="bg-brand-dark/45 p-3 rounded-xl border border-brand-border/50 flex flex-col justify-between h-20">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovered Length</span>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold font-mono text-indigo-400">
                {animatedMetrics.recovered_length}m
              </span>
              <span className="text-[9px] text-slate-500">restored</span>
            </div>
          </div>

          {/* Recovered Intersections */}
          <div className="bg-brand-dark/45 p-3 rounded-xl border border-brand-border/50 flex flex-col justify-between h-20">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovered Junctions</span>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold font-mono text-amber-500">
                {animatedMetrics.recovered_intersections}
              </span>
              <span className="text-[9px] text-slate-500">connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
