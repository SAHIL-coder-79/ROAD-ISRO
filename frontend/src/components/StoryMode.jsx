import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Camera, Map, Activity, HeartPulse, BarChart3, AlertTriangle, Route, Lightbulb, FileText, Loader2, Presentation } from 'lucide-react';

const STORY_SLIDES = [
  { icon: Camera, title: 'Satellite Image Uploaded', desc: 'High-resolution satellite imagery received and processed by the AI pipeline.', color: 'text-brand-glow' },
  { icon: Activity, title: 'Road Extraction Completed', desc: 'Deep learning U-Net model successfully extracted road network from satellite imagery.', color: 'text-brand-glow' },
  { icon: Map, title: 'Graph Network Constructed', desc: 'Topological graph built from extracted road mask with full connectivity analysis.', color: 'text-emerald-400' },
  { icon: BarChart3, title: 'Critical Roads Detected', desc: 'Centrality metrics identified high-risk segments. Bridges and articulation points flagged.', color: 'text-amber-400' },
  { icon: AlertTriangle, title: 'Disaster Simulation Executed', desc: 'Flood and earthquake scenarios applied. Network resilience score calculated.', color: 'text-red-400' },
  { icon: Route, title: 'Emergency Routes Generated', desc: 'Alternate bypass routes computed for emergency services and evacuation.', color: 'text-blue-400' },
  { icon: Lightbulb, title: 'AI Recommendations Produced', desc: 'Actionable insights generated for road reinforcement and network optimization.', color: 'text-purple-400' },
  { icon: FileText, title: 'Executive Report Ready', desc: 'Comprehensive report compiled with maps, charts, and government-ready formatting.', color: 'text-brand-glow' },
];

export default function StoryMode({ project, onSlideChange }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide(prev => {
          if (prev >= STORY_SLIDES.length - 1) { setIsPlaying(false); return prev; }
          const next = prev + 1;
          if (onSlideChange) onSlideChange(next);
          return next;
        });
      }, 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, onSlideChange]);

  const startPresentation = () => {
    setCurrentSlide(0);
    setIsPlaying(true);
    if (onSlideChange) onSlideChange(0);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Presentation className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project for auto story mode.</p>
      </div>
    );
  }

  const SlideIcon = STORY_SLIDES[currentSlide].icon;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border min-h-[300px] flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <Presentation className="w-4 h-4 text-brand-glow" />
          Auto Story Mode
        </h3>
        <p className="text-[10px] text-slate-500 mb-4">One-click narrated presentation</p>

        {!isPlaying && currentSlide === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-glow/20 to-purple-500/20 border border-brand-glow/30 flex items-center justify-center">
              <Presentation className="w-10 h-10 text-brand-glow" />
            </div>
            <p className="text-xs text-slate-400 text-center max-w-[250px]">
              Click start for an automated presentation of the complete analysis workflow.
            </p>
            <button onClick={startPresentation}
              className="px-6 py-3 text-sm font-bold bg-brand-glow text-brand-dark rounded-xl hover:bg-emerald-400 transition flex items-center gap-2 shadow-lg">
              <Play className="w-5 h-5" /> Start Presentation
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className={`w-16 h-16 rounded-2xl bg-brand-dark border border-brand-border flex items-center justify-center ${STORY_SLIDES[currentSlide].color}`}>
              <SlideIcon className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-200 mb-1">{STORY_SLIDES[currentSlide].title}</h2>
              <p className="text-[10px] text-slate-400 max-w-[280px] leading-relaxed">{STORY_SLIDES[currentSlide].desc}</p>
            </div>
            <div className="flex gap-1.5">
              {STORY_SLIDES.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentSlide ? 'bg-brand-glow w-4' : i < currentSlide ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-lg bg-brand-glow text-brand-dark">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-400">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={() => {
                const next = Math.min(currentSlide + 1, STORY_SLIDES.length - 1);
                setCurrentSlide(next);
                if (onSlideChange) onSlideChange(next);
              }} className="p-2 rounded-lg bg-brand-card border border-brand-border text-slate-400">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Slide {currentSlide + 1} of {STORY_SLIDES.length}
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Presentation Outline</h3>
        <div className="space-y-1">
          {STORY_SLIDES.map((slide, i) => {
            const Icon = slide.icon;
            return (
              <button key={i} onClick={() => { setCurrentSlide(i); if (onSlideChange) onSlideChange(i); }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs transition ${
                  i === currentSlide ? 'bg-brand-glow/10 border border-brand-glow/30 text-brand-glow' :
                  i < currentSlide ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{slide.title}</span>
                {i === currentSlide && <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-brand-glow/20 rounded font-mono">Now</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
