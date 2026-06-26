import React, { useState } from 'react';
import { Eye, Sun, Cloud, Moon, Filter, X, ChevronRight, Brain, Info, Shield } from 'lucide-react';

const OCCLUSION_TYPES = [
  { type: 'Shadow', icon: Moon, desc: 'Building or structure shadow reducing road visibility', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { type: 'Trees', icon: Sun, desc: 'Tree canopy obscuring road surface', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { type: 'Cloud', icon: Cloud, desc: 'Cloud cover in satellite imagery', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { type: 'Blur', icon: Filter, desc: 'Motion or atmospheric blur', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

const MOCK_SEGMENTS = [
  { id: 'node_100_200 ↔ node_150_180', confidence: 92, occlusion: 'None', criticality: 0.7 },
  { id: 'node_200_300 ↔ node_220_280', confidence: 78, occlusion: 'Shadow', criticality: 0.85 },
  { id: 'node_50_100 ↔ node_80_120', confidence: 65, occlusion: 'Trees', criticality: 0.45 },
  { id: 'node_300_100 ↔ node_350_80', confidence: 88, occlusion: 'None', criticality: 0.6 },
  { id: 'node_150_50 ↔ node_180_70', confidence: 55, occlusion: 'Cloud', criticality: 0.35 },
  { id: 'node_250_200 ↔ node_270_230', confidence: 72, occlusion: 'Blur', criticality: 0.5 },
  { id: 'node_400_300 ↔ node_420_280', confidence: 95, occlusion: 'None', criticality: 0.9 },
];

export default function ConfidenceOverlay({ project }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? MOCK_SEGMENTS : MOCK_SEGMENTS.filter(s => s.occlusion.toLowerCase() === filter);

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

        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {filtered.map((seg, i) => (
            <button key={i} onClick={() => setSelected(selected === i ? null : i)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                selected === i ? 'bg-brand-glow/10 border-brand-glow/30' : 'bg-brand-dark/40 border-brand-border/40 hover:border-slate-400'
              }`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${seg.confidence > 85 ? 'bg-emerald-400' : seg.confidence > 70 ? 'bg-amber-400' : 'bg-red-400'}`} />
                <span className="font-mono text-[9px] text-slate-300 truncate">{seg.id}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  seg.occlusion === 'None' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>{seg.occlusion}</span>
                <span className={`font-mono text-[10px] font-bold ${seg.confidence > 85 ? 'text-emerald-400' : seg.confidence > 70 ? 'text-amber-400' : 'text-red-400'}`}>
                  {seg.confidence}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected !== null && (
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
            if (!seg) return null;
            const occ = OCCLUSION_TYPES.find(o => o.type.toLowerCase() === seg.occlusion.toLowerCase());
            const Icon = occ?.icon || Eye;
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

                {occ && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${occ.bg} ${occ.color} border-brand-border`}>
                    <Icon className="w-5 h-5" />
                    <div>
                      <div className="text-xs font-semibold">{occ.type} Occlusion</div>
                      <div className="text-[10px] text-slate-400">{occ.desc}</div>
                    </div>
                  </div>
                )}

                <div className="bg-brand-dark/40 border border-brand-border rounded-xl p-3">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 font-mono">Model Reasoning</h4>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    {seg.occlusion === 'None'
                      ? 'High spectral contrast detected. Road surface shows clear reflectance profile with sharp parallel boundaries.'
                      : `Occlusion detected: ${seg.occlusion} coverage. Model uses contextual topological cues to reconstruct road centerline. Confidence affected by reduced pixel information.`}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <Shield className="w-3 h-3" />
                  Criticality Score: {(seg.criticality * 100).toFixed(0)}%
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
