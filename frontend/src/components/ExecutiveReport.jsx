import React, { useState } from 'react';
import { FileText, Download, FileSpreadsheet, Map, FileImage, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

export default function ExecutiveReport({ project }) {
  const [exporting, setExporting] = useState(null);
  const [exportDone, setExportDone] = useState(null);

  const exportFormats = [
    { id: 'pdf', label: 'PDF Report', icon: FileText, desc: 'Professional government-ready PDF with all analytics', color: 'text-red-400 border-red-500/30 bg-red-500/5' },
    { id: 'csv', label: 'CSV Data', icon: FileSpreadsheet, desc: 'Tabular data for spreadsheet analysis', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
    { id: 'json', label: 'JSON Export', icon: Map, desc: 'Full metric data for external integration', color: 'text-blue-400 border-blue-500/30 bg-blue-500/5' },
  ];

  const handleExport = async (format) => {
    if (!project || !project.id) return;
    
    setExporting(format);
    setExportDone(null);
    
    try {
      const response = await fetch(`/api/report/${format}/${project.id}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `roadshield_report_${project.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setExportDone(format);
    } catch (err) {
      console.error(err);
      alert('Failed to generate report');
    } finally {
      setExporting(null);
      setTimeout(() => setExportDone(null), 3000);
    }
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <FileText className="w-12 h-12 mb-3 text-brand-border" />
        <p className="text-sm font-medium">Load a project to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-brand-glow" />
          Executive Report Generator
        </h3>
        <p className="text-[10px] text-slate-500 mb-4">Export professional disaster resilience reports</p>

        <div className="space-y-3">
          {exportFormats.map((fmt) => (
            <div key={fmt.id} className={`p-3 rounded-xl border ${fmt.color} transition-all ${exportDone === fmt.id ? 'ring-2 ring-emerald-400/50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-brand-dark border border-brand-border">
                    <fmt.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{fmt.label}</h4>
                    <p className="text-[9px] text-slate-500">{fmt.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleExport(fmt.id)}
                  disabled={exporting === fmt.id}
                  className="px-3 py-1.5 text-[10px] font-semibold bg-brand-glow text-brand-dark rounded-lg hover:bg-emerald-400 transition disabled:opacity-50 flex items-center gap-1"
                >
                  {exporting === fmt.id ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Generating</>
                  ) : exportDone === fmt.id ? (
                    <><CheckCircle2 className="w-3 h-3" /> Done</>
                  ) : (
                    <><Download className="w-3 h-3" /> Export</>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-3 text-[8px] text-slate-500 font-mono border-t border-brand-border/40 pt-2 mt-1">
                <span>📄 Project Summary</span>
                <span>🗺️ Maps</span>
                <span>📊 Charts</span>
                <span>📋 Tables</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Report Contents</h3>
        <div className="space-y-1.5">
          {[
            'Executive Summary',
            'Satellite Image & Road Extraction',
            'Road Healing & Graph Construction',
            'Graph Analytics & Critical Roads',
            'Risk Heatmap & Disaster Simulation',
            'Emergency Routing & AI Recommendations',
            'Infrastructure Impact Analysis',
            'Network Health Index & Recovery Score',
            'Budget Optimization Plan'
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
              <div className="w-4 h-4 rounded-full bg-brand-glow/10 border border-brand-glow/20 flex items-center justify-center">
                <span className="text-[6px] text-brand-glow font-bold">{i + 1}</span>
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
