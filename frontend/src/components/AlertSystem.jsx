import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2, X, Shield, Activity, HeartPulse, Zap, Clock, Filter, Loader2, Trash2 } from 'lucide-react';

const ICON_MAP = {
  critical: AlertTriangle,
  warning: Shield,
  info: Info,
  success: CheckCircle2,
  weather: Activity,
  bridge: HeartPulse,
};

const COLOR_MAP = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  info: 'text-brand-glow bg-brand-glow/10 border-brand-glow/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  weather: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  bridge: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function AlertSystem({ project }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (project) fetchAlerts();
  }, [project]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/advanced/alerts/${project.id}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.length > 0 ? data : generateMockAlerts());
      }
    } catch (err) {
      setAlerts(generateMockAlerts());
    } finally {
      setLoading(false);
    }
  };

  const generateMockAlerts = () => [
    { id: 1, type: 'critical', message: 'Critical road detected: node_100 ↔ node_200 has 92% vulnerability', severity: 'critical', timestamp: new Date().toISOString() },
    { id: 2, type: 'warning', message: 'Connectivity dropped below 70% threshold', severity: 'warning', timestamp: new Date(Date.now() - 120000).toISOString() },
    { id: 3, type: 'bridge', message: 'Bridge failure detected at node_300 ↔ node_350', severity: 'critical', timestamp: new Date(Date.now() - 300000).toISOString() },
    { id: 4, type: 'info', message: 'Hospital isolated in sector 4 - emergency routing required', severity: 'warning', timestamp: new Date(Date.now() - 600000).toISOString() },
    { id: 5, type: 'weather', message: 'Weather alert: Heavy rainfall expected in project area', severity: 'info', timestamp: new Date(Date.now() - 1800000).toISOString() },
    { id: 6, type: 'success', message: 'Road healing completed for 3 segments', severity: 'info', timestamp: new Date(Date.now() - 3600000).toISOString() },
  ];

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter || a.severity === filter);
  const unread = alerts.filter(a => !a.read).length;

  const notificationTypes = [
    { id: 'all', label: 'All', count: alerts.length },
    { id: 'critical', label: 'Critical', count: alerts.filter(a => a.severity === 'critical' || a.type === 'critical').length },
    { id: 'warning', label: 'Warnings', count: alerts.filter(a => a.severity === 'warning').length },
    { id: 'info', label: 'Info', count: alerts.filter(a => a.severity === 'info').length },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-panel/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-amber-400" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Alert Center</h3>
        </div>
        <button onClick={() => setAlerts([])} className="p-1 text-slate-400 hover:text-white transition" title="Clear all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-1.5 px-4 py-2 border-b border-brand-border bg-brand-dark/20">
        {notificationTypes.map(nt => (
          <button key={nt.id} onClick={() => setFilter(nt.id)}
            className={`text-[8px] px-2 py-1 rounded-full font-medium transition ${
              filter === nt.id ? 'bg-brand-glow text-brand-dark' : 'bg-brand-card border border-brand-border text-slate-400 hover:text-slate-200'
            }`}>
            {nt.label} ({nt.count})
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-brand-glow animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <CheckCircle2 className="w-8 h-8" />
            <p className="text-xs">No alerts to display</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alert, i) => {
              const Icon = ICON_MAP[alert.type] || AlertTriangle;
              const colors = COLOR_MAP[alert.type] || COLOR_MAP.info;
              return (
                <div key={alert.id || i} className={`p-3 rounded-xl border ${colors} transition hover:opacity-80`}>
                  <div className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-200 leading-relaxed">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        <span className="text-[8px] text-slate-500 font-mono">
                          {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                        </span>
                        <span className={`text-[7px] px-1.5 py-0.5 rounded-full uppercase font-bold ${
                          alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-glow/20 text-brand-glow'
                        }`}>
                          {alert.severity || alert.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!project && (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 p-8">
          <Bell className="w-12 h-12 mb-3 text-brand-border" />
          <p className="text-sm font-medium">Load a project for live alerts.</p>
        </div>
      )}
    </div>
  );
}
