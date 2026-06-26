import React, { useEffect, useState } from 'react';
import { Brain, Search, Info, ShieldAlert, Cpu, Eye, CheckCircle2, ChevronRight, X } from 'lucide-react';

export default function XaiPanel({ project, xaiRoad, onClear }) {
  const [loading, setLoading] = useState(false);
  const [xaiData, setXaiData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project && xaiRoad) {
      fetchXaiData();
    } else {
      setXaiData(null);
      setError(null);
    }
  }, [project, xaiRoad]);

  const fetchXaiData = async () => {
    setLoading(true);
    setError(null);
    try {
      const source = xaiRoad.properties.source;
      const target = xaiRoad.properties.target;
      const response = await fetch(`/api/projects/${project.id}/explain?source=${source}&target=${target}`);
      if (!response.ok) throw new Error('Failed to fetch XAI explanation');
      
      const data = await response.json();
      setXaiData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!xaiRoad) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-glow/10 border border-brand-glow/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
          <Brain className="w-8 h-8 text-brand-glow opacity-80" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1 font-display tracking-wide uppercase">Explainable AI</h3>
          <p className="text-xs max-w-[240px] leading-relaxed opacity-80">
            Click <strong className="text-brand-glow font-medium">🔬 Analyze AI Decision</strong> on any road segment popup to view model confidence, occlusion reasoning, and attention heatmaps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar pb-4 relative">
      
      {/* Header */}
      <div className="flex justify-between items-start bg-brand-surface border border-brand-border p-4 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-glow/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
        <div className="z-10">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1.5 uppercase tracking-wide font-display">
            <Brain className="w-4 h-4 text-brand-glow" />
            Decision Explorer
          </h2>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-brand-dark/50 px-2 py-1 rounded inline-flex border border-brand-border/50">
            <span className="truncate max-w-[90px]">{xaiRoad.properties.source}</span>
            <ChevronRight className="w-3 h-3 text-brand-glow" />
            <span className="truncate max-w-[90px]">{xaiRoad.properties.target}</span>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="p-1.5 hover:bg-brand-dark/50 rounded-lg text-slate-400 hover:text-white transition z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-brand-glow">
          <Cpu className="w-6 h-6 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest animate-pulse">Analyzing Segment...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-red-400 mb-1">Analysis Failed</h4>
            <p className="text-[10px] text-slate-300">{error}</p>
          </div>
        </div>
      )}

      {!loading && xaiData && (
        <div className="flex flex-col gap-4 animate-fade-in">
          
          {/* Confidence Gauge */}
          <div className="bg-brand-surface border border-brand-border rounded-xl p-4 flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-glow/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
            
            {/* Circular Progress */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-brand-dark/50"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${xaiData.confidence > 85 ? 'text-brand-glow' : xaiData.confidence > 60 ? 'text-amber-400' : 'text-red-400'} drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]`}
                  strokeDasharray={`${xaiData.confidence}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-medium">Conf</span>
                <span className="text-sm font-bold text-slate-100 font-mono tracking-tighter">
                  {xaiData.confidence.toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-glow" />
                Prediction Certainty
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                The model's confidence in this specific topological link based on local pixel distributions and network flow.
              </p>
            </div>
          </div>

          {/* Attention Heatmap (Grad-CAM proxy) */}
          <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden flex flex-col group">
            <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between bg-brand-panel/30">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand-accent" />
                Attention Heatmap
              </h4>
              <span className="text-[9px] bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-1.5 py-0.5 rounded font-mono">
                grad_cam
              </span>
            </div>
            <div className="relative w-full aspect-square bg-brand-dark overflow-hidden p-3 flex items-center justify-center">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-glow/5 via-brand-dark to-brand-dark"></div>
               <img 
                  src={xaiData.heatmap} 
                  alt="Model Attention Heatmap" 
                  className="relative z-10 max-h-full max-w-full rounded-lg border border-brand-border/50 shadow-2xl transition-transform duration-700 hover:scale-105"
               />
               <div className="absolute bottom-4 left-0 w-full flex justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-brand-dark/80 backdrop-blur border border-brand-border px-3 py-1.5 rounded-full flex items-center gap-2 text-[9px] font-medium">
                     <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_blue]"></div> Low Activation
                     <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_5px_yellow] ml-2"></div>
                     <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red] ml-2"></div> High Activation
                  </div>
               </div>
            </div>
          </div>

          {/* Reasoning & Features */}
          <div className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col gap-4">
            
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-purple-400" />
                Detected Occlusion
              </h4>
              <div className="bg-brand-dark/50 border border-brand-border/50 rounded-lg p-2.5 flex items-center">
                 <span className={`text-xs font-medium ${xaiData.occlusion_type.includes('None') ? 'text-emerald-400' : 'text-amber-400'}`}>
                   {xaiData.occlusion_type}
                 </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Network Reasoning
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed bg-brand-dark/50 border border-brand-border/50 rounded-lg p-3 italic">
                "{xaiData.reason}"
              </p>
            </div>

            <div>
               <h4 className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                 Local Features Leveraged
               </h4>
               <div className="flex flex-wrap gap-2">
                 {xaiData.nearby_features.map((feat, idx) => (
                   <span key={idx} className="px-2 py-1 bg-brand-glow/5 border border-brand-glow/10 text-brand-glow text-[9px] rounded-md font-medium tracking-wide">
                     {feat}
                   </span>
                 ))}
               </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
