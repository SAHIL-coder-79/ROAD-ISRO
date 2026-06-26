import React, { useState } from 'react';
import { BarChart3, GitCompare, Loader2, TrendingUp, Shield, Activity, HeartPulse, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function CityComparison({ projects }) {
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleProject = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const compare = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch('/api/advanced/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_ids: selected })
      });
      if (res.ok) setResults(await res.json());
    } catch (err) {
      console.error('Comparison failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!projects || projects.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <GitCompare className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Need at least 2 projects for comparison.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <GitCompare className="w-4 h-4 text-brand-glow" />
          Multi-City Comparison
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">Compare network metrics across projects</p>

        <div className="space-y-1.5 mb-3">
          {projects.map(p => (
            <button key={p.id} onClick={() => toggleProject(p.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                selected.includes(p.id) ? 'bg-brand-glow/10 border-brand-glow/30 text-brand-glow' : 'bg-brand-dark/40 border-brand-border/40 text-slate-400 hover:border-slate-400'
              }`}>
              <span className="font-medium">{p.name}</span>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                selected.includes(p.id) ? 'border-brand-glow bg-brand-glow' : 'border-slate-500'
              }`}>
                {selected.includes(p.id) && <div className="w-2 h-2 rounded-sm bg-brand-dark" />}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={compare}
          disabled={loading || selected.length < 2}
          className="w-full py-2.5 text-xs font-semibold bg-brand-glow text-brand-dark rounded-xl hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing...</>
            : <><BarChart3 className="w-4 h-4" /> Compare {selected.length} Projects</>}
        </button>
      </div>

      {results && results.length > 1 && (
        <>
          <div className="glass-panel p-3 rounded-xl border border-brand-border">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono">Metrics Comparison</h3>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.map(r => ({ name: r.name.split('_')[0], ...r.metrics }))} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2C4D" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0A1325', border: '1px solid #1A2C4D', fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 8, color: '#64748B' }} />
                  <Bar dataKey="connectivity" fill="#00E5FF" radius={[2, 2, 0, 0]} name="Connectivity" />
                  <Bar dataKey="health_score" fill="#10B981" radius={[2, 2, 0, 0]} name="Health Score" />
                  <Bar dataKey="emergency_access" fill="#FF6B00" radius={[2, 2, 0, 0]} name="Emergency Access" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-brand-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Detailed Metrics</h3>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`p-3 rounded-xl border ${r.best_practice ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-brand-border bg-brand-dark/40'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{r.name}</span>
                      {r.best_practice && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">BEST</span>}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Rank #{r.rank}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                    <div><span className="text-slate-500">Connectivity:</span> <span className="text-brand-glow font-mono">{r.metrics.connectivity}%</span></div>
                    <div><span className="text-slate-500">Critical:</span> <span className="text-red-400 font-mono">{r.metrics.critical_roads}</span></div>
                    <div><span className="text-slate-500">Risk:</span> <span className="text-amber-400 font-mono">{r.metrics.risk_score}%</span></div>
                    <div><span className="text-slate-500">Recovery:</span> <span className="text-emerald-400 font-mono">{r.metrics.recovery}%</span></div>
                    <div><span className="text-slate-500">Emerg Access:</span> <span className="text-purple-400 font-mono">{r.metrics.emergency_access}%</span></div>
                    <div><span className="text-slate-500">Health:</span> <span className="text-brand-glow font-mono">{r.metrics.health_score}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
