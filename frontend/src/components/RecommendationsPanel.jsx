import React, { useState, useEffect } from 'react';
import { Lightbulb, Split, Map, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

export default function RecommendationsPanel({ project }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [project]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${project.id}/recommendations`);
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Bridge Reinforcement': return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'Road Duplication': return <Split className="w-5 h-5 text-indigo-400" />;
      case 'Alternative Road': return <Map className="w-5 h-5 text-emerald-400" />;
      default: return <Lightbulb className="w-5 h-5 text-brand-glow" />;
    }
  };

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 glass-panel rounded-2xl border border-brand-border">
        <Lightbulb className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm font-medium text-center">Load a project to view AI recommendations.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-brand-glow" />
          AI Recommendations
        </h3>
        <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
          Graph analytics-based suggestions for network efficiency, travel time reduction, and critical infrastructure fortification.
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 text-brand-glow animate-spin" />
            <span className="text-xs text-slate-400 animate-pulse">Running Graph Analysis...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-3 text-center text-slate-400 text-xs bg-brand-dark/50 rounded-xl border border-brand-border/40">
            No actionable recommendations found. Network is optimal.
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="bg-brand-dark border border-brand-border hover:border-brand-glow/50 transition-colors p-3.5 rounded-xl group relative overflow-hidden">
                {/* Subtle gradient background based on type */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-[0.03] pointer-events-none ${
                  rec.type === 'Bridge Reinforcement' ? 'bg-red-500' :
                  rec.type === 'Road Duplication' ? 'bg-indigo-500' : 'bg-emerald-500'
                }`}></div>

                <div className="flex items-start gap-3 relative z-10">
                  <div className={`p-2 rounded-lg border ${
                    rec.type === 'Bridge Reinforcement' ? 'bg-red-500/10 border-red-500/20' :
                    rec.type === 'Road Duplication' ? 'bg-indigo-500/10 border-indigo-500/20' :
                    'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    {getIcon(rec.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-200">{rec.type}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 font-mono bg-brand-border text-slate-300 rounded font-semibold tracking-wider">
                        {rec.target}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 mb-3 leading-relaxed">
                      {rec.description}
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-brand-border/40">
                      {Object.entries(rec.metrics).map(([label, value], idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-mono font-bold text-brand-glow bg-brand-glow/10 px-1.5 rounded">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
