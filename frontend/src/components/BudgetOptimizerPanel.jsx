import React, { useState } from 'react';
import { DollarSign, PiggyBank, TrendingUp, BarChart3, CheckCircle2, Loader2, Zap, Shield, Route } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function BudgetOptimizerPanel({ project }) {
  const [budget, setBudget] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const optimize = async () => {
    if (!project || !budget) return;
    setLoading(true);
    setError('');
    try {
      const amount = parseFloat(budget.replace(/[^0-9.]/g, ''));
      const res = await fetch('/api/advanced/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, budget_amount: amount, currency: 'INR' })
      });
      if (!res.ok) throw new Error('Budget optimization failed');
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <PiggyBank className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for budget optimization.</p>
      </div>
    );
  }

  const COLORS = ['#00E5FF', '#FF6B00', '#10B981', '#8B5CF6', '#EF4444'];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <PiggyBank className="w-4 h-4 text-brand-glow" />
          Budget Optimizer
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">AI-powered budget allocation for maximum resilience</p>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">₹</span>
            <input
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="5,00,00,000"
              className="w-full bg-brand-dark border border-brand-border rounded-xl pl-7 pr-3 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-glow text-slate-200"
            />
          </div>
          <button
            onClick={optimize}
            disabled={loading || !budget}
            className="px-4 py-2.5 bg-brand-accent text-white rounded-xl hover:bg-orange-500 transition disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Optimize
          </button>
        </div>
        {error && <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg mb-2">{error}</div>}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-panel p-3 rounded-xl border border-brand-glow/20 bg-brand-glow/5">
              <DollarSign className="w-4 h-4 text-brand-glow mb-1" />
              <div className="text-lg font-bold text-brand-glow font-mono">₹{(result.allocated / 10000000).toFixed(2)}Cr</div>
              <div className="text-[8px] text-slate-500 uppercase">Allocated</div>
            </div>
            <div className="glass-panel p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-lg font-bold text-emerald-400 font-mono">+{result.expected_connectivity_increase}%</div>
              <div className="text-[8px] text-slate-500 uppercase">Expected Gain</div>
            </div>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-brand-border">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono">Cost-Benefit Analysis</h3>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={result.cost_benefit} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="cost"
                    label={({ category, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {result.cost_benefit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0A1325', border: '1px solid #1A2C4D', fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-brand-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recommended Roads ({result.roads_to_repair})</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              {result.recommendations.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-brand-dark/40 rounded-lg border border-brand-border/40">
                  <div className="flex items-center gap-2">
                    {r.is_bridge ? <Shield className="w-3 h-3 text-red-400" /> : <Route className="w-3 h-3 text-brand-glow" />}
                    <span className="text-[10px] font-mono text-slate-300">{r.source} ↔ {r.target}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${r.priority === 'critical' ? 'bg-red-500/10 text-red-400' : r.priority === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {r.priority}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">₹{(r.estimated_cost / 100000).toFixed(1)}L</span>
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
