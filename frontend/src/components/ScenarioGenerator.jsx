import React, { useState } from 'react';
import { Beaker, FlaskConical, Waves, Mountain, TreePine, Building2, AlertTriangle, Loader2, ArrowRight, CheckCircle2, Globe } from 'lucide-react';

const DISASTER_TYPES = [
  { id: 'Flood', label: 'Flood', icon: Waves, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'Bridge Collapse', label: 'Bridge Collapse', icon: Building2, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { id: 'Landslide', label: 'Landslide', icon: Mountain, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'Tree Fall', label: 'Tree Fall', icon: TreePine, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'Earthquake', label: 'Earthquake', icon: Globe, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
];

const COMBINATIONS = [
  ['Flood', 'Bridge Collapse'],
  ['Flood', 'Tree Fall'],
  ['Flood', 'Landslide'],
  ['Earthquake', 'Bridge Collapse'],
  ['Earthquake', 'Landslide'],
  ['Flood', 'Earthquake', 'Bridge Collapse'],
];

export default function ScenarioGenerator({ project, onScenarioResults }) {
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDisaster = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const generateScenario = async () => {
    if (!project || selected.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/advanced/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, disaster_types: selected, intensity: 1.0 })
      });
      if (!res.ok) throw new Error('Scenario generation failed');
      const data = await res.json();
      setResults(data);
      if (onScenarioResults) onScenarioResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyCombination = (combo) => setSelected(combo);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Beaker className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for scenario generation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <FlaskConical className="w-4 h-4 text-brand-glow" />
          AI Scenario Generator
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">Combine multiple disasters for complex scenarios</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {DISASTER_TYPES.map(d => {
            const Icon = d.icon;
            const isSelected = selected.includes(d.id);
            return (
              <button key={d.id} onClick={() => toggleDisaster(d.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                  isSelected ? `${d.bg} ${d.border} ${d.color}` : 'border-brand-border text-slate-500 hover:border-slate-400'
                }`}>
                <Icon className={`w-4 h-4 ${isSelected ? d.color : 'text-slate-500'}`} />
                <span className="font-medium">{d.label}</span>
                {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </div>

        <div className="mb-3">
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 font-mono">Quick Combinations</h4>
          <div className="flex flex-wrap gap-1.5">
            {COMBINATIONS.map((combo, i) => (
              <button key={i} onClick={() => applyCombination(combo)}
                className="text-[8px] px-2 py-1 rounded-full bg-brand-card border border-brand-border text-slate-400 hover:border-brand-glow/40 hover:text-brand-glow transition">
                {combo.join(' + ')}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateScenario}
          disabled={loading || selected.length === 0}
          className="w-full py-2.5 text-xs font-semibold bg-gradient-to-r from-red-500/30 to-orange-500/30 border border-red-500/30 text-red-300 rounded-xl hover:from-red-500/40 hover:to-orange-500/40 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Scenario...</>
            : <><AlertTriangle className="w-4 h-4" /> Generate {selected.length > 0 ? selected.join(' + ') : 'Scenario'}</>}
        </button>
        {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
      </div>

      {results && (
        <div className="glass-panel p-4 rounded-2xl border border-brand-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-brand-glow" /> Scenario: {results.name}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs bg-red-500/5 p-2 rounded-lg border border-red-500/20">
              <span className="text-slate-400">Resilience Score</span>
              <span className="font-mono text-red-400 font-bold">{results.results.resilience_score}%</span>
            </div>
            <div className="flex justify-between text-xs bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
              <span className="text-slate-400">Connectivity Loss</span>
              <span className="font-mono text-amber-400 font-bold">{results.results.connectivity_loss}%</span>
            </div>
            <div className="flex justify-between text-xs bg-orange-500/5 p-2 rounded-lg border border-orange-500/20">
              <span className="text-slate-400">Disconnected Regions</span>
              <span className="font-mono text-orange-400 font-bold">{results.results.disconnected_regions_count}</span>
            </div>
            <div className="flex justify-between text-xs bg-brand-dark/50 p-2 rounded-lg border border-brand-border">
              <span className="text-slate-400">Blocked Nodes</span>
              <span className="font-mono text-slate-300">{results.blocked_nodes.length}</span>
            </div>
            <div className="flex justify-between text-xs bg-brand-dark/50 p-2 rounded-lg border border-brand-border">
              <span className="text-slate-400">Blocked Edges</span>
              <span className="font-mono text-slate-300">{results.blocked_edges.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
