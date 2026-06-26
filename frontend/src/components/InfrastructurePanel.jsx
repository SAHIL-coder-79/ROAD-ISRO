import React, { useState, useEffect } from 'react';
import { Building2, HeartPulse, School, Building, Train, Zap, Droplets, AlertTriangle, Users, Clock, Shield, ArrowLeft } from 'lucide-react';

const ICON_MAP = {
  hospital: { icon: HeartPulse, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  school: { icon: School, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  police_station: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  fire_station: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  airport: { icon: Building, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  railway_station: { icon: Train, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  power_grid: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  water_supply: { icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
};

export default function InfrastructurePanel({ project, onShowAssets }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [impactView, setImpactView] = useState(false);
  const [impact, setImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);

  useEffect(() => {
    if (project) {
      fetchAssets();
    }
  }, [project]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/infrastructure/assets/${project.id}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const runImpact = async () => {
    setImpactLoading(true);
    try {
      const res = await fetch('/api/infrastructure/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          disaster_type: 'flood',
          affected_nodes: assets.filter(a => a.node_id).map(a => a.node_id).slice(0, 5)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setImpact(data);
        setImpactView(true);
      }
    } catch (err) {
      console.error('Impact analysis failed:', err);
    } finally {
      setImpactLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Building2 className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for infrastructure analysis.</p>
      </div>
    );
  }

  const infraTypes = [...new Set(assets.map(a => a.asset_type))];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {!impactView ? (
        <>
          <div className="glass-panel p-4 rounded-2xl border border-brand-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-brand-glow" />
              Infrastructure Assets
            </h3>
            <p className="text-[10px] text-slate-500 mb-3">Critical infrastructure registered in the network</p>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-brand-glow border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {infraTypes.map(type => {
                  const typeAssets = assets.filter(a => a.asset_type === type);
                  const meta = ICON_MAP[type] || { icon: Building2, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
                  const Icon = meta.icon;
                  return (
                    <div key={type} className={`flex items-center justify-between p-2.5 rounded-xl border ${meta.border} ${meta.bg}`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                        <span className="text-xs text-slate-200 capitalize font-medium">{type.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300">{typeAssets.length}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-brand-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Impact Analysis</h3>
            <p className="text-[10px] text-slate-500 mb-3">Calculate disaster impact on infrastructure</p>
            <button
              onClick={runImpact}
              disabled={impactLoading || assets.length === 0}
              className="w-full py-2.5 text-xs font-semibold bg-brand-accent text-white rounded-xl hover:bg-orange-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {impactLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
              ) : (
                <><AlertTriangle className="w-4 h-4" /> Run Impact Analysis</>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="glass-panel p-4 rounded-2xl border border-brand-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Impact Results
            </h3>
            <button onClick={() => setImpactView(false)} className="text-xs text-brand-glow hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </div>

          {impact && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
                  <Users className="w-4 h-4 text-red-400 mb-1" />
                  <div className="text-lg font-bold text-red-400 font-mono">{impact.population_affected.toLocaleString()}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-wider">Population Affected</div>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl">
                  <Building2 className="w-4 h-4 text-orange-400 mb-1" />
                  <div className="text-lg font-bold text-orange-400 font-mono">{impact.buildings_disconnected}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-wider">Buildings Disconnected</div>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
                  <HeartPulse className="w-4 h-4 text-red-400 mb-1" />
                  <div className="text-lg font-bold text-red-400 font-mono">{impact.hospitals_unreachable}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-wider">Hospitals Unreachable</div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                  <Clock className="w-4 h-4 text-amber-400 mb-1" />
                  <div className="text-lg font-bold text-amber-400 font-mono">{impact.avg_delay_minutes}min</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-wider">Avg Delay</div>
                </div>
              </div>

              <div className="bg-brand-dark/50 border border-brand-border rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Accessibility Reduction</span>
                  <span className="font-mono text-red-400 font-bold">{impact.accessibility_reduction}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Recovery Estimate</span>
                  <span className="font-mono text-emerald-400 font-bold">{impact.recovery_hours_estimate}h</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Disconnected Regions</span>
                  <span className="font-mono text-orange-400 font-bold">{impact.disconnected_regions}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Affected Assets</span>
                  <span className="font-mono text-red-400 font-bold">{impact.affected_assets_count}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
