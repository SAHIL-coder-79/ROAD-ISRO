import React, { useState } from 'react';
import { HeartPulse, TrendingUp, TrendingDown, Activity, Zap, Shield, Lightbulb, Loader2, ArrowUp, ArrowDown } from 'lucide-react';

export default function NetworkHealthPanel({ project }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const computeHealth = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/advanced/health/${project.id}`);
      if (res.ok) setHealth(await res.json());
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <HeartPulse className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for health assessment.</p>
      </div>
    );
  }

  const gradeColors = { A: 'text-emerald-400', B: 'text-brand-glow', C: 'text-amber-400', D: 'text-orange-400', F: 'text-red-400' };
  const gradeBg = { A: 'bg-emerald-500/10 border-emerald-500/20', B: 'bg-brand-glow/10 border-brand-glow/20', C: 'bg-amber-500/10 border-amber-500/20', D: 'bg-orange-500/10 border-orange-500/20', F: 'bg-red-500/10 border-red-500/20' };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <HeartPulse className="w-4 h-4 text-brand-glow" />
          Network Health Index
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">Overall city network health assessment</p>

        {!health && (
          <button
            onClick={computeHealth}
            disabled={loading}
            className="w-full py-3 text-xs font-semibold bg-gradient-to-r from-emerald-500/20 to-brand-glow/20 border border-emerald-500/30 text-emerald-400 rounded-xl hover:from-emerald-500/30 hover:to-brand-glow/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Computing...</>
              : <><HeartPulse className="w-4 h-4" /> Compute Health Index</>}
          </button>
        )}

        {health && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-brand-dark" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-brand-glow drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                    strokeDasharray={`${health.health_score}, 100`} strokeWidth="3" strokeLinecap="round"
                    stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black font-mono ${gradeColors[health.health_grade] || 'text-slate-200'}`}>
                    {health.health_score.toFixed(0)}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">/100</span>
                </div>
              </div>
              <div className="ml-4">
                <div className={`text-5xl font-black ${gradeColors[health.health_grade] || 'text-slate-200'}`}>{health.health_grade}</div>
                <div className="text-[10px] text-slate-400 font-mono">Health Grade</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Connectivity', value: `${health.connectivity}%`, color: 'text-brand-glow' },
                { label: 'Criticality', value: `${health.criticality_score}%`, color: 'text-emerald-400' },
                { label: 'Bridge Risk', value: `${health.bridge_risk}%`, color: 'text-amber-400' },
                { label: 'Trend', value: health.trend, color: health.trend === 'improving' ? 'text-emerald-400' : 'text-red-400', icon: health.trend === 'improving' ? TrendingUp : TrendingDown },
              ].map((m, i) => (
                <div key={i} className="bg-brand-dark/40 p-2.5 rounded-xl border border-brand-border/40">
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider">{m.label}</span>
                  <div className={`text-sm font-bold font-mono ${m.color} flex items-center gap-1`}>
                    {m.icon && <m.icon className="w-3 h-3" />}{m.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-brand-dark/50 border border-brand-border rounded-xl p-3">
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono">Improvement Suggestions</h4>
              <div className="space-y-1.5">
                {health.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <Lightbulb className="w-3 h-3 text-brand-glow shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono bg-brand-dark/30 rounded-lg p-2">
              <span>Nodes: {health.metrics.total_nodes}</span>
              <span>Edges: {health.metrics.total_edges}</span>
              <span>Bridges: {health.metrics.bridge_count}</span>
              <span>Components: {health.metrics.components}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
