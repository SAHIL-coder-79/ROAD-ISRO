import React, { useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, Shield, Waves, Mountain, Activity, Loader2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PredictiveAIPanel({ project }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runPrediction = async () => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/advanced/predict/${project.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, prediction_type: 'vulnerability' })
      });
      if (!res.ok) throw new Error('Prediction failed');
      const data = await res.json();
      setPredictions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Brain className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for AI predictions.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-brand-glow" />
          Predictive AI Engine
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">AI-powered vulnerability and risk prediction</p>

        {!predictions && (
          <button
            onClick={runPrediction}
            disabled={loading}
            className="w-full py-3 text-xs font-semibold bg-gradient-to-r from-brand-glow/20 to-purple-500/20 border border-brand-glow/30 text-brand-glow rounded-xl hover:from-brand-glow/30 hover:to-purple-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Network...</>
              : <><Brain className="w-4 h-4" /> Run AI Prediction</>}
          </button>
        )}

        {error && <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg">{error}</div>}
      </div>

      {predictions && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-panel p-3 rounded-xl border border-red-500/20 bg-red-500/5">
              <AlertTriangle className="w-4 h-4 text-red-400 mb-1" />
              <div className="text-lg font-bold text-red-400 font-mono">{predictions.summary.high_vulnerability}</div>
              <div className="text-[8px] text-slate-500 uppercase">High Risk</div>
            </div>
            <div className="glass-panel p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <Activity className="w-4 h-4 text-amber-400 mb-1" />
              <div className="text-lg font-bold text-amber-400 font-mono">{predictions.summary.medium_vulnerability}</div>
              <div className="text-[8px] text-slate-500 uppercase">Medium Risk</div>
            </div>
            <div className="glass-panel p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <Shield className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-lg font-bold text-emerald-400 font-mono">{predictions.summary.low_vulnerability}</div>
              <div className="text-[8px] text-slate-500 uppercase">Low Risk</div>
            </div>
            <div className="glass-panel p-3 rounded-xl border border-brand-glow/20 bg-brand-glow/5">
              <Brain className="w-4 h-4 text-brand-glow mb-1" />
              <div className="text-lg font-bold text-brand-glow font-mono">{predictions.summary.avg_confidence}%</div>
              <div className="text-[8px] text-slate-500 uppercase">Avg Confidence</div>
            </div>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-brand-border">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3 text-brand-accent" /> Top Vulnerable Nodes
            </h3>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={predictions.predictions.slice(0, 8).map(p => ({
                  name: p.node_id.slice(-6),
                  score: p.vulnerability_score
                }))} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0A1325', border: '1px solid #1A2C4D', fontSize: 10 }} />
                  <Bar dataKey="score" fill="#EF4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-brand-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Node Predictions</h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
              {predictions.predictions.slice(0, 10).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-brand-dark/40 rounded-lg border border-brand-border/40">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${p.vulnerability_score > 70 ? 'bg-red-400' : p.vulnerability_score > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="text-[10px] font-mono text-slate-300">{p.node_id.slice(-8)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-slate-500">F:{p.flood_risk.toFixed(0)}%</span>
                    <span className="text-[9px] text-slate-500">L:{p.landslide_risk.toFixed(0)}%</span>
                    <span className="text-[9px] font-bold font-mono" style={{ color: p.vulnerability_score > 70 ? '#EF4444' : p.vulnerability_score > 40 ? '#F59E0B' : '#10B981' }}>
                      {p.confidence.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[9px] text-slate-500 p-2">
            <span className="flex items-center gap-1"><Waves className="w-3 h-3 text-blue-400" /> Flood Risk</span>
            <span className="flex items-center gap-1"><Mountain className="w-3 h-3 text-amber-400" /> Landslide</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-red-400" /> Deterioration</span>
          </div>
        </>
      )}
    </div>
  );
}
