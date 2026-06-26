import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Camera, Map, Activity, HeartPulse, BarChart3, AlertTriangle, Route, Lightbulb, FileText, CheckCircle2, Loader2 } from 'lucide-react';

const MISSION_STEPS = [
  { id: 'upload', label: 'Image Upload', icon: Camera, desc: 'Satellite imagery uploaded and processed' },
  { id: 'segmentation', label: 'AI Segmentation', icon: Activity, desc: 'Deep learning road extraction completed' },
  { id: 'healing', label: 'Road Healing', icon: HeartPulse, desc: 'Gaps and occlusions repaired in network' },
  { id: 'graph', label: 'Graph Construction', icon: Map, desc: 'Topological graph built from road mask' },
  { id: 'analysis', label: 'Critical Analysis', icon: BarChart3, desc: 'Centrality and vulnerability metrics computed' },
  { id: 'simulation', label: 'Simulation', icon: AlertTriangle, desc: 'Disaster scenarios simulated on network' },
  { id: 'routing', label: 'Routing', icon: Route, desc: 'Emergency alternate routes calculated' },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb, desc: 'AI-driven improvement suggestions generated' },
  { id: 'report', label: 'Report', icon: FileText, desc: 'Executive summary and analytics compiled' },
];

export default function MissionPlayback({ project }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recorded, setRecorded] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= MISSION_STEPS.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  const startRecording = () => {
    setIsRecording(true);
    setRecorded([]);
    let i = 0;
    const recInterval = setInterval(() => {
      if (i < MISSION_STEPS.length) {
        setRecorded(prev => [...prev, { ...MISSION_STEPS[i], timestamp: new Date().toLocaleTimeString() }]);
        i++;
      } else {
        clearInterval(recInterval);
        setIsRecording(false);
      }
    }, 1200);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Camera className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for mission playback.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-brand-glow" />
          Mission Playback
        </h3>
        <p className="text-[10px] text-slate-500 mb-3">Record and replay the complete workflow</p>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { if (isPlaying) setIsPlaying(false); else { setCurrentStep(0); setIsPlaying(true); } }}
            className="flex-1 py-2.5 text-xs font-semibold bg-brand-glow text-brand-dark rounded-xl hover:bg-emerald-400 transition flex items-center justify-center gap-2"
          >
            {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Play All</>}
          </button>
          <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
            className="px-3 py-2.5 bg-brand-card border border-brand-border text-slate-300 rounded-xl hover:bg-brand-border transition">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-brand-border" />
          <div className="space-y-1 relative">
            {MISSION_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <button key={step.id} onClick={() => setCurrentStep(i)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition ${
                    isActive ? 'bg-brand-glow/10 border border-brand-glow/30' :
                    isDone ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-brand-border/30 border border-transparent'
                  }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-brand-glow text-brand-dark' :
                    isDone ? 'bg-emerald-500 text-white' : 'bg-brand-border text-slate-400'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${isActive ? 'text-brand-glow' : isDone ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {step.label}
                    </div>
                    <div className="text-[8px] text-slate-500">{step.desc}</div>
                  </div>
                  {isActive && <span className="text-[8px] px-1.5 py-0.5 bg-brand-glow/20 text-brand-glow rounded font-mono">Now</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Mission Recorder</h3>
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="w-full py-2.5 text-xs font-semibold bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl hover:bg-red-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isRecording ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</>
            : <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Record Workflow</>}
        </button>
        {recorded.length > 0 && (
          <div className="mt-3 space-y-1">
            {recorded.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                <span className="text-slate-500">[{r.timestamp}]</span>
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                {r.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
