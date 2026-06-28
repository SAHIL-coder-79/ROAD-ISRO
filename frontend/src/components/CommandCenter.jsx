import React, { useState, useEffect } from 'react';
import { Monitor, Activity, HeartPulse, Shield, Bell, AlertTriangle, Clock, Wifi, Cpu, Zap, Radio, Signal, Loader2 } from 'lucide-react';

export default function CommandCenter({ project, alerts, systemStatus }) {
  const [time, setTime] = useState(new Date());
  const [statusItems, setStatusItems] = useState([]);
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let telemetryTimer;
    const fetchTelemetry = async () => {
      if (!project) return;
      try {
        const res = await fetch(`http://localhost:8000/advanced/telemetry/${project.id}`);
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
        }
      } catch (err) {
        console.error("Failed to fetch telemetry:", err);
      }
    };

    fetchTelemetry();
    telemetryTimer = setInterval(fetchTelemetry, 5000);

    return () => clearInterval(telemetryTimer);
  }, [project]);

  useEffect(() => {
    setStatusItems([
      { label: 'System Status', value: 'ONLINE', color: 'text-emerald-400', icon: Wifi, pulse: true },
      { label: 'AI Engine', value: 'ACTIVE', color: 'text-brand-glow', icon: Cpu },
      { label: 'Road Network', value: project ? `${project.name}` : 'STANDBY', color: 'text-brand-glow', icon: Activity },
      { label: 'Telemetry', value: 'RECEIVING', color: 'text-emerald-400', icon: Radio, pulse: true },
      { label: 'Signal Strength', value: '98%', color: 'text-emerald-400', icon: Signal },
      { label: 'Disaster Status', value: telemetry ? telemetry.disaster_status : 'NONE', color: telemetry && telemetry.disaster_status !== 'None' ? 'text-red-400' : 'text-slate-400', icon: AlertTriangle, pulse: telemetry && telemetry.disaster_status !== 'None' },
    ]);
  }, [project, telemetry]);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-glow/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-brand-glow" />
              Live Command Center
            </h3>
            <div className="flex items-center gap-2 text-[9px] font-mono text-brand-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {time.toLocaleTimeString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {statusItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-brand-dark/50 border border-brand-border/50 rounded-lg p-2.5 flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${item.color} ${item.pulse ? 'animate-pulse' : ''}`} />
                  <div>
                    <div className="text-[7px] text-slate-500 uppercase tracking-wider">{item.label}</div>
                    <div className={`text-[10px] font-bold font-mono ${item.color}`}>{item.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <HeartPulse className="w-4 h-4 text-emerald-400" />
          System Telemetry
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Road Health Index</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full" style={{ width: `${telemetry?.health_index || 0}%`, transition: 'width 1s ease-in-out' }} />
              </div>
              <span className="font-mono text-slate-300">{telemetry?.health_index || 0}%</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Network Efficiency</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-brand-glow rounded-full" style={{ width: `${telemetry?.network_efficiency || 0}%`, transition: 'width 1s ease-in-out' }} />
              </div>
              <span className="font-mono text-slate-300">{telemetry?.network_efficiency || 0}%</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Emergency Access</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-emerald-400 rounded-full" style={{ width: `${telemetry?.emergency_accessibility || 0}%`, transition: 'width 1s ease-in-out' }} />
              </div>
              <span className="font-mono text-slate-300">{telemetry?.emergency_accessibility || 0}%</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Critical Roads</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                <div className="h-full bg-brand-glow rounded-full" style={{ width: `${telemetry?.critical_roads_pct || 0}%`, transition: 'width 1s ease-in-out' }} />
              </div>
              <span className="font-mono text-slate-300">{telemetry?.critical_roads_count || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-amber-400" />
          Live Alerts
        </h3>
        <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
          {(alerts || []).length === 0 ? (
            <div className="text-[10px] text-slate-500 text-center py-3">No active alerts</div>
          ) : (
            alerts.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[9px] font-mono">
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                  a.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                  a.severity === 'warning' ? 'bg-amber-400' : 'bg-brand-glow'
                }`} />
                <span className="text-slate-500">[{new Date(a.timestamp || Date.now()).toLocaleTimeString()}]</span>
                <span className={a.severity === 'critical' ? 'text-red-400' : a.severity === 'warning' ? 'text-amber-400' : 'text-slate-300'}>
                  {a.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel p-3 rounded-2xl border border-brand-border">
        <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> MISSION TIME</span>
          <span className="text-brand-glow">{time.toLocaleTimeString()}</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> UPTIME</span>
          <span className="text-emerald-400">24d 12h 31m</span>
        </div>
      </div>
    </div>
  );
}
