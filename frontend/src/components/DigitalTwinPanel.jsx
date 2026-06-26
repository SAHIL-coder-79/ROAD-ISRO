import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, RotateCcw, Film, Sliders } from 'lucide-react';

const TWIN_STAGES = [
  { id: 'healthy', label: 'Healthy Roads', icon: '🟢', desc: 'Baseline network - all roads operational' },
  { id: 'disaster_start', label: 'Disaster Starts', icon: '⚠️', desc: 'Initial impact detected at epicenter' },
  { id: 'road_damage', label: 'Road Damage', icon: '🔴', desc: 'Road segments begin to fail' },
  { id: 'fragmentation', label: 'Network Fragmentation', icon: '💔', desc: 'Network splits into isolated components' },
  { id: 'emergency_routing', label: 'Emergency Routing', icon: '🚑', desc: 'Emergency services reroute traffic' },
  { id: 'road_healing', label: 'Road Healing', icon: '🛠️', desc: 'AI-driven road reconnection begins' },
  { id: 'recovered', label: 'Recovered Network', icon: '🟢', desc: 'Network restored with improved resilience' },
];

export default function DigitalTwinPanel({ project, onStageChange }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStage(prev => {
          if (prev >= TWIN_STAGES.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          if (onStageChange) onStageChange(TWIN_STAGES[next].id);
          return next;
        });
      }, 2000 / speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, onStageChange]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleReset = () => { setCurrentStage(0); setIsPlaying(false); if (onStageChange) onStageChange(TWIN_STAGES[0].id); };
  const handleSkipForward = () => {
    const next = Math.min(currentStage + 1, TWIN_STAGES.length - 1);
    setCurrentStage(next);
    if (onStageChange) onStageChange(TWIN_STAGES[next].id);
  };
  const handleSkipBack = () => {
    const prev = Math.max(currentStage - 1, 0);
    setCurrentStage(prev);
    if (onStageChange) onStageChange(TWIN_STAGES[prev].id);
  };
  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value);
    setCurrentStage(val);
    if (onStageChange) onStageChange(TWIN_STAGES[val].id);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Film className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for digital twin replay.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Film className="w-4 h-4 text-brand-glow" />
          Digital Twin Replay
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">Animated network lifecycle visualization</p>

        <div className="space-y-3">
          <div className="relative">
            <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 rounded-full transition-all duration-500"
                style={{ width: `${(currentStage / (TWIN_STAGES.length - 1)) * 100}%` }} />
            </div>
            <input
              type="range"
              min="0"
              max={TWIN_STAGES.length - 1}
              value={currentStage}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="bg-brand-dark/50 border border-brand-border rounded-xl p-3 min-h-[80px]">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{TWIN_STAGES[currentStage].icon}</span>
              <div>
                <div className="text-sm font-bold text-slate-200">{TWIN_STAGES[currentStage].label}</div>
                <div className="text-[10px] text-slate-400">{TWIN_STAGES[currentStage].desc}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-mono">
              <Clock className="w-2.5 h-2.5" />
              Stage {currentStage + 1} of {TWIN_STAGES.length}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button onClick={handleReset} className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-400 hover:text-brand-glow transition" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleSkipBack} className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-400 hover:text-brand-glow transition" title="Previous">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={handlePlayPause} className="p-3 rounded-xl bg-brand-glow text-brand-dark hover:bg-emerald-400 transition shadow-lg" title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={handleSkipForward} className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-400 hover:text-brand-glow transition" title="Next">
              <SkipForward className="w-4 h-4" />
            </button>
            <div className="ml-2 flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-slate-500" />
              <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
                className="bg-brand-dark border border-brand-border rounded px-1.5 py-1 text-[10px] text-slate-300 focus:outline-none">
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Timeline</h3>
        <div className="space-y-1.5">
          {TWIN_STAGES.map((stage, i) => (
            <button
              key={stage.id}
              onClick={() => { setCurrentStage(i); if (onStageChange) onStageChange(stage.id); }}
              className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs transition ${
                i === currentStage
                  ? 'bg-brand-glow/10 border border-brand-glow/30 text-brand-glow'
                  : i < currentStage ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:bg-brand-border/30'
              }`}
            >
              <span>{stage.icon}</span>
              <span className="font-medium">{stage.label}</span>
              {i === currentStage && <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded bg-brand-glow/20">Now</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
