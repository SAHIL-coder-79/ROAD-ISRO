import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, SkipBack, SkipForward, Square,
  Camera, Map, Activity, HeartPulse, BarChart3, AlertTriangle,
  Route, Lightbulb, FileText, CheckCircle2, Loader2, Gauge,
  RefreshCw, ChevronRight
} from 'lucide-react';

const API = 'http://localhost:8000';

const EVENT_ICONS = {
  upload:          Camera,
  segmentation:    Activity,
  healing:         HeartPulse,
  graph:           Map,
  analysis:        BarChart3,
  simulation:      AlertTriangle,
  routing:         Route,
  recommendations: Lightbulb,
  report:          FileText,
};

const EVENT_COLORS = {
  upload:          'text-sky-400',
  segmentation:    'text-violet-400',
  healing:         'text-emerald-400',
  graph:           'text-brand-glow',
  analysis:        'text-amber-400',
  simulation:      'text-red-400',
  routing:         'text-orange-400',
  recommendations: 'text-yellow-400',
  report:          'text-cyan-400',
};

const SPEEDS = [1, 2, 4];
const STEP_MS = { 1: 2000, 2: 1000, 4: 500 };

export default function MissionPlayback({ project }) {
  const [events, setEvents]         = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);   // -1 = not started
  const [isPlaying, setIsPlaying]   = useState(false);
  const [speedIdx, setSpeedIdx]     = useState(0);
  const [loading, setLoading]       = useState(false);
  const [summary, setSummary]       = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const intervalRef = useRef(null);
  const speed = SPEEDS[speedIdx];

  // ─── Fetch events from backend ────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/mission/${project.id}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        setCurrentStep(-1);
        setIsPlaying(false);
        setShowSummary(false);
        setSummary(null);
      }
    } catch (e) {
      console.error('Mission fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ─── Regenerate from real project history ─────────────────────────────────
  const regenerate = async () => {
    if (!project) return;
    setLoading(true);
    try {
      await fetch(`${API}/mission/${project.id}/generate`, { method: 'POST' });
      await loadEvents();
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch summary after last step ────────────────────────────────────────
  const fetchSummary = async () => {
    if (!project) return;
    try {
      const res = await fetch(`${API}/mission/${project.id}/summary`);
      if (res.ok) setSummary(await res.json());
    } catch (e) { /* silent */ }
  };

  // ─── Playback engine ──────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!isPlaying || events.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= events.length) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          setShowSummary(true);
          fetchSummary();
          return prev;
        }
        return next;
      });
    }, STEP_MS[speed]);

    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, events.length]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const play  = () => { if (currentStep >= events.length - 1) setCurrentStep(0); setIsPlaying(true); setShowSummary(false); };
  const pause = () => setIsPlaying(false);
  const stop  = () => { setIsPlaying(false); setCurrentStep(-1); setShowSummary(false); };
  const prev  = () => { setIsPlaying(false); setCurrentStep(s => Math.max(0, s - 1)); };
  const next  = () => {
    setIsPlaying(false);
    setCurrentStep(s => {
      const n = Math.min(events.length - 1, s + 1);
      if (n === events.length - 1) { setShowSummary(true); fetchSummary(); }
      return n;
    });
  };
  const replay = () => { stop(); setTimeout(play, 50); };
  const cycleSpeed = () => setSpeedIdx(i => (i + 1) % SPEEDS.length);

  // ─── No project ───────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Camera className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for mission playback.</p>
      </div>
    );
  }

  const activeEvent = currentStep >= 0 ? events[currentStep] : null;
  const progress = events.length > 0 ? ((currentStep + 1) / events.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">

      {/* ── Header + Controls ─────────────────────────────────────────── */}
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-brand-glow" />
            Mission Playback
          </h3>
          <div className="flex items-center gap-1.5 text-[9px] font-mono">
            <button onClick={cycleSpeed}
              className="px-2 py-0.5 rounded bg-brand-glow/10 text-brand-glow border border-brand-glow/20 hover:bg-brand-glow/20 transition">
              {speed}x
            </button>
            {loading && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mb-3">
          {events.length} events · step {Math.max(0, currentStep + 1)}/{events.length}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-brand-dark rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-glow to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Control row */}
        <div className="flex gap-1.5 mb-3">
          <button onClick={prev} disabled={currentStep <= 0}
            className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-300 hover:bg-brand-border transition disabled:opacity-40">
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {isPlaying
            ? <button onClick={pause}
                className="flex-1 py-2 text-xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl hover:bg-amber-500/30 transition flex items-center justify-center gap-2">
                <Pause className="w-4 h-4" /> Pause
              </button>
            : <button onClick={play} disabled={events.length === 0}
                className="flex-1 py-2 text-xs font-semibold bg-brand-glow text-brand-dark rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 disabled:opacity-40">
                <Play className="w-4 h-4" /> {currentStep < 0 ? 'Play Mission' : 'Resume'}
              </button>
          }

          <button onClick={next} disabled={currentStep >= events.length - 1}
            className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-300 hover:bg-brand-border transition disabled:opacity-40">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button onClick={stop}
            className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-300 hover:bg-brand-border transition">
            <Square className="w-3.5 h-3.5" />
          </button>
          <button onClick={replay} disabled={events.length === 0}
            className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-300 hover:bg-brand-border transition disabled:opacity-40">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Regenerate button */}
        <button onClick={regenerate} disabled={loading}
          className="w-full py-1.5 text-[10px] font-medium bg-brand-dark border border-brand-border text-slate-400 rounded-lg hover:text-slate-200 hover:border-slate-500 transition flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Rebuild from Real Project History
        </button>
      </div>

      {/* ── Active Step Card ───────────────────────────────────────────── */}
      {activeEvent && (
        <div className="glass-panel p-4 rounded-2xl border border-brand-glow/30 bg-brand-glow/5">
          {(() => {
            const Icon = EVENT_ICONS[activeEvent.event_type] || Activity;
            const col  = EVENT_COLORS[activeEvent.event_type] || 'text-brand-glow';
            return (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${col}`} />
                  <span className={`text-xs font-bold ${col}`}>{activeEvent.title}</span>
                  <span className="ml-auto text-[8px] font-mono text-slate-500">
                    {new Date(activeEvent.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 mb-3">{activeEvent.description}</p>
                {activeEvent.payload && Object.keys(activeEvent.payload).length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(activeEvent.payload)
                      .filter(([k]) => !['image_url','mask_url','method','report_formats','created_at','project_name'].includes(k))
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <div key={k} className="bg-brand-dark/60 rounded-lg p-2">
                          <div className="text-[7px] text-slate-500 uppercase tracking-wider">{k.replace(/_/g,' ')}</div>
                          <div className="text-[11px] font-bold font-mono text-slate-200">
                            {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : String(v)}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Event Timeline ─────────────────────────────────────────────── */}
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Event Timeline</h3>
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-brand-glow animate-spin" />
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-brand-border" />
            <div className="space-y-1 relative">
              {events.map((ev, i) => {
                const Icon    = EVENT_ICONS[ev.event_type] || Activity;
                const col     = EVENT_COLORS[ev.event_type] || 'text-brand-glow';
                const isActive = i === currentStep;
                const isDone   = i < currentStep;
                return (
                  <button key={ev.id} onClick={() => { setCurrentStep(i); setIsPlaying(false); setShowSummary(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition ${
                      isActive ? 'bg-brand-glow/10 border border-brand-glow/30' :
                      isDone   ? 'bg-emerald-500/5 border border-emerald-500/20' :
                                 'hover:bg-brand-border/30 border border-transparent'
                    }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-brand-glow text-brand-dark' :
                      isDone   ? 'bg-emerald-500 text-white'      :
                                 'bg-brand-border text-slate-400'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${isActive ? col : isDone ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {ev.title}
                      </div>
                      <div className="text-[8px] text-slate-500 truncate max-w-[180px]">{ev.description}</div>
                    </div>
                    {isActive && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-brand-glow/20 text-brand-glow rounded font-mono shrink-0">NOW</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Mission Summary (shown after playback ends) ────────────────── */}
      {showSummary && summary && (
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Mission Complete
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">
            <span className="font-semibold text-slate-200">{summary.project_name}</span> ·{' '}
            {summary.total_steps} steps · {summary.scenarios_run} scenario{summary.scenarios_run !== 1 ? 's' : ''} run
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ['Health Index',     `${summary.metrics?.health_index ?? '--'}%`],
              ['Network Nodes',    summary.metrics?.total_nodes ?? '--'],
              ['Road Segments',    summary.metrics?.total_edges ?? '--'],
              ['Critical Roads',   summary.metrics?.critical_roads ?? '--'],
              ['Bridges',          summary.metrics?.bridge_count ?? '--'],
              ['Emergency Access', `${summary.metrics?.emergency_accessibility ?? '--'}%`],
            ].map(([label, val]) => (
              <div key={label} className="bg-brand-dark/60 rounded-lg p-2">
                <div className="text-[7px] text-slate-500 uppercase tracking-wider">{label}</div>
                <div className="text-[11px] font-bold font-mono text-emerald-300">{val}</div>
              </div>
            ))}
          </div>
          <button onClick={replay}
            className="mt-3 w-full py-2 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl hover:bg-emerald-500/20 transition flex items-center justify-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> Replay Mission
          </button>
        </div>
      )}
    </div>
  );
}
