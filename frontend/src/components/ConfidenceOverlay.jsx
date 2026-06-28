import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Sun, Cloud, Moon, Filter, X, ChevronRight, Brain, Info, Shield, Loader2 } from 'lucide-react';

const OCCLUSION_TYPES = [
  { type: 'Tree Canopy Shadow', icon: Sun, desc: 'Tree canopy obscuring road surface', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { type: 'Urban Building Shadow', icon: Moon, desc: 'Building or structure shadow reducing road visibility', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { type: 'None (Direct Line of Sight)', icon: Eye, desc: 'Clear visibility of road surface', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { type: 'Cloud', icon: Cloud, desc: 'Cloud cover in satellite imagery', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { type: 'Blur', icon: Filter, desc: 'Motion or atmospheric blur', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export default function ConfidenceOverlay({ project, onSelectRoad }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project || !project.geojson_network) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const parsed = JSON.parse(project.geojson_network);
        const edges = parsed.features
          .filter(f => f.properties.type === 'road')
          .sort((a, b) => (b.properties.criticality || 0) - (a.properties.criticality || 0))
          .slice(0, 15); // Top 15 to keep API requests reasonable

        const enrichedSegments = await Promise.all(edges.map(async (e) => {
          try {
            const res = await fetch(`/api/projects/${project.id}/explain?source=${e.properties.source}&target=${e.properties.target}`);
            if (res.ok) {
              const data = await res.json();
              return {
                id: `${e.properties.source} ↔ ${e.properties.target}`,
                source: e.properties.source,
                target: e.properties.target,
                criticality: e.properties.criticality || 0,
                length: e.properties.weight || 0,
                confidence: data.confidence,
                occlusion: data.occlusion_type,
                reason: data.reason,
                nearby_features: data.nearby_features,
                heatmap: data.heatmap
              };
            }
          } catch (err) {
            console.error(err);
          }
          return null;
        }));
        
        setSegments(enrichedSegments.filter(s => s !== null));
      } catch (err) {
        console.error("Failed to load confidence data", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [project]);

  const getShortOcclusion = (occ) => {
    if (occ.includes('Tree')) return 'Trees';
    if (occ.includes('Building')) return 'Shadow';
    if (occ.includes('None')) return 'None';
    return occ;
  };

  const filtered = filter === 'all' ? segments : segments.filter(s => getShortOcclusion(s.occlusion).toLowerCase() === filter);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Eye className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for confidence overlay.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-brand-glow" />
          AI Confidence Overlay
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">Per-segment confidence and occlusion analysis</p>

        <div className="flex gap-1.5 mb-3 flex-wrap">
          {['all', 'none', 'shadow', 'trees', 'cloud', 'blur'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setSelected(null); }}
              className={`text-[8px] px-2 py-1 rounded-full capitalize ${
                filter === f ? 'bg-brand-glow text-brand-dark font-bold' : 'bg-brand-card border border-brand-border text-slate-400 hover:text-slate-200'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-brand-glow" />
            <p className="text-xs">Analyzing network confidence...</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {filtered.map((seg, i) => (
              <button key={i} onClick={() => {
                  const newSelected = selected === i ? null : i;
                  setSelected(newSelected);
                  if (onSelectRoad) {
                    onSelectRoad(newSelected !== null ? filtered[newSelected].id : null);
                  }
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                  selected === i ? 'bg-brand-glow/10 border-brand-glow/30' : 'bg-brand-dark/40 border-brand-border/40 hover:border-slate-400'
                }`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${seg.confidence > 85 ? 'bg-emerald-400' : seg.confidence > 70 ? 'bg-amber-400' : 'bg-red-400'}`} />
                  <span className="font-mono text-[9px] text-slate-300 truncate">{seg.id}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    getShortOcclusion(seg.occlusion) === 'None' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>{getShortOcclusion(seg.occlusion)}</span>
                  <span className={`font-mono text-[10px] font-bold ${seg.confidence > 85 ? 'text-emerald-400' : seg.confidence > 70 ? 'text-amber-400' : 'text-red-400'}`}>
                    {seg.confidence}%
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
               <p className="text-xs text-center text-slate-500 py-4">No segments match filter.</p>
            )}
          </div>
        )}
      </div>

      {selected !== null && filtered[selected] && (
        <div className="glass-panel p-4 rounded-2xl border border-brand-border animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-brand-glow" />
              Explanation Panel
            </h3>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {(() => {
            const seg = filtered[selected];
            const occ = OCCLUSION_TYPES.find(o => o.type.toLowerCase() === seg.occlusion.toLowerCase()) || OCCLUSION_TYPES[0];
            const Icon = occ.icon;
            return (
              <div className="space-y-3">
                <div className="bg-brand-dark/50 border border-brand-border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">{seg.id}</span>
                    <span className={`text-lg font-black font-mono ${seg.confidence > 85 ? 'text-emerald-400' : seg.confidence > 70 ? 'text-amber-400' : 'text-red-400'}`}>
                      {seg.confidence}%
                    </span>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-brand-dark rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      seg.confidence > 85 ? 'bg-emerald-400' : seg.confidence > 70 ? 'bg-amber-400' : 'bg-red-400'
                    }`} style={{ width: `${seg.confidence}%` }} />
                  </div>
                </div>

                {seg.heatmap && (
                   <div className="rounded-xl overflow-hidden border border-brand-border h-24 relative">
                      <img src={seg.heatmap} alt="Confidence Heatmap" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                         <span className="text-[9px] font-bold text-white uppercase tracking-wider">Distance Transform Heatmap</span>
                      </div>
                   </div>
                )}

                <div className={`flex items-center gap-3 p-3 rounded-xl border ${occ.bg} ${occ.color} border-brand-border`}>
                  <Icon className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold">{seg.occlusion}</div>
                    <div className="text-[10px] text-slate-400 opacity-80">{occ.desc}</div>
                  </div>
                </div>

                <div className="bg-brand-dark/40 border border-brand-border rounded-xl p-3">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono">Prediction Reason</h4>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    {seg.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                    <Shield className="w-3 h-3 text-brand-glow" />
                    Criticality Score: {(seg.criticality * 100).toFixed(0)}%
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    Len: {seg.length.toFixed(1)} px
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
