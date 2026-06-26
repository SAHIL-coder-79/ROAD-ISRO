import React, { useState, useEffect } from 'react';
import { HeartPulse, TrendingUp, Activity, Route, Zap, Loader2, CheckCircle2, Gauge } from 'lucide-react';

function AnimatedNumber({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === undefined) return;
    const steps = 20;
    const stepTime = 50;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplay(Number((value / steps) * step).toFixed(decimals));
      if (step >= steps) { clearInterval(timer); setDisplay(value); }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value, decimals]);
  return <>{display}{suffix}</>;
}

export default function RecoveryScorePanel({ project }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRecovery = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/advanced/recovery/${project.id}`);
      if (res.ok) setMetrics(await res.json());
    } catch (err) {
      console.error('Recovery fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (project) fetchRecovery(); }, [project]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <HeartPulse className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for recovery score.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-brand-glow animate-spin" />
      </div>
    );
  }

  const m = metrics || { recovery_pct: 0, connectivity_gain: 0, recovered_roads: 0, healing_speed: 0, efficiency_score: 0 };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-brand-glow" />
          Recovery Score Dashboard
        </h3>
        <p className="text-[10px] text-slate-500 mb-4">Road healing performance metrics</p>

        <div className="flex items-center justify-center mb-4">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-brand-dark" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                strokeDasharray={`${m.recovery_pct}, 100`} strokeWidth="3" strokeLinecap="round"
                stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono text-emerald-400"><AnimatedNumber value={m.recovery_pct} decimals={1} /></span>
              <span className="text-[8px] text-slate-500 uppercase">Recovery</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brand-dark/50 border border-brand-border/50 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-brand-glow" />
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Conn. Gain</span>
            </div>
            <div className="text-xl font-bold font-mono text-brand-glow">
              +<AnimatedNumber value={m.connectivity_gain} decimals={1} suffix="%" />
            </div>
          </div>
          <div className="bg-brand-dark/50 border border-brand-border/50 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Recovered</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              <AnimatedNumber value={m.recovered_roads} decimals={0} />
            </div>
          </div>
          <div className="bg-brand-dark/50 border border-brand-border/50 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Healing Speed</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-400">
              <AnimatedNumber value={m.healing_speed} decimals={1} suffix="%" />
            </div>
          </div>
          <div className="bg-brand-dark/50 border border-brand-border/50 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Efficiency</span>
            </div>
            <div className="text-xl font-bold font-mono text-purple-400">
              <AnimatedNumber value={m.efficiency_score} decimals={1} suffix="%" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-brand-glow" />
          <h3 className="text-xs font-bold text-slate-200">Recovery Summary</h3>
        </div>
        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between bg-brand-dark/30 p-2 rounded-lg">
            <span className="text-slate-400">Total Nodes</span>
            <span className="font-mono text-slate-300">{m.total_nodes || 0}</span>
          </div>
          <div className="flex justify-between bg-brand-dark/30 p-2 rounded-lg">
            <span className="text-slate-400">Total Edges</span>
            <span className="font-mono text-slate-300">{m.total_edges || 0}</span>
          </div>
          <div className="flex justify-between bg-brand-dark/30 p-2 rounded-lg">
            <span className="text-slate-400">Connected Components</span>
            <span className="font-mono text-slate-300">{m.components || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
