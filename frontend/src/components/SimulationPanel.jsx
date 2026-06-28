import React, { useState } from 'react';
import { Upload, AlertTriangle, RotateCcw, Play, Compass, FileText, CheckCircle2, Loader2 } from 'lucide-react';

export default function SimulationPanel({ 
  projects, 
  selectedProjectId, 
  onSelectProject, 
  onUploadImage,
  simulationMode,
  setSimulationMode,
  blockedNodes,
  blockedEdges,
  onClearSimulation,
  onTriggerSimulation,
  simSource,
  simTarget,
  setSimTarget,
  emergencyLocations,
  routeFound,
  isSimulating
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [disasterType, setDisasterType] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }
    
    // Auto-fill name if left empty
    const networkName = name.trim() ? name.trim() : (file.name ? file.name.split('.')[0] : 'New Network');


    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('name', networkName);
      formData.append('file', file);
      
      // Default center coords (e.g. San Francisco)
      formData.append('center_lat', '37.7749');
      formData.append('center_lon', '-122.4194');

      const response = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Upload failed');
      }

      const result = await response.json();
      onUploadImage(result);
      setName('');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('sat-upload');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'Error uploading satellite image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* 1. Project Selector & Uploader */}
      <div className="glass-panel p-4 rounded-2xl border border-brand-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Load Map Network</h3>
        
        {/* Project select */}
        <select 
          value={selectedProjectId || ''}
          onChange={(e) => onSelectProject(Number(e.target.value))}
          className="w-full bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-glow transition text-slate-200"
        >
          <option value="" disabled>Select an extracted road network...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Separator */}
        <div className="flex items-center my-3 text-slate-500">
          <div className="flex-1 border-t border-brand-border"></div>
          <span className="px-2 text-[10px] font-bold uppercase">or Upload Image</span>
          <div className="flex-1 border-t border-brand-border"></div>
        </div>

        {/* Upload form */}
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            type="text"
            placeholder="Network Name (e.g. SF Downtown)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-brand-dark border border-brand-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-glow transition text-slate-200"
          />
          <div className="relative border border-dashed border-brand-border hover:border-brand-glow/70 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition">
            <input
              type="file"
              id="sat-upload"
              accept=".png,.jpg,.jpeg,.tiff,.tif"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-brand-glow mb-1" />
            <span className="text-[10px] font-medium text-slate-400">
              {file ? file.name : 'Select PNG, JPG, or TIFF'}
            </span>
          </div>
          
          {uploadError && (
            <div className="text-[10px] text-red-400 flex items-center gap-1 font-medium bg-red-950/20 p-2 rounded-lg border border-red-900/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              {uploadError}
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-brand-glow text-brand-dark hover:bg-emerald-400 rounded-xl transition disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting Roads AI...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-brand-dark" />
                Process & Extract Roads
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. Simulation Sandbox */}
      {selectedProjectId && (
        <div className="glass-panel p-4 rounded-2xl border border-brand-border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulation Sandbox</h3>
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
              simulationMode 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {simulationMode ? 'Sandbox Active' : 'Normal State'}
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Toggle sandbox mode, click any junction on the map to block a road, or select two coordinates to calculate real-time bypass routing.
            </p>

            <button
              onClick={() => setSimulationMode(!simulationMode)}
              className={`w-full py-2 text-xs font-semibold rounded-xl border transition ${
                simulationMode 
                  ? 'bg-red-950/20 border-red-500/30 text-red-300 hover:bg-red-950/40' 
                  : 'bg-brand-accent/20 border-brand-accent/40 text-indigo-300 hover:bg-brand-accent/30'
              }`}
            >
              {simulationMode ? 'Exit Sandbox Mode' : 'Enter Sandbox Mode'}
            </button>

            {/* Blockage and Path Routing details */}
            {simulationMode && (
              <div className="space-y-3 bg-brand-dark/30 p-3 rounded-xl border border-brand-border/40 text-xs">
                {/* Blocked list */}
                <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                  <span className="text-slate-400">Blocked Junctions:</span>
                  <span className="font-bold text-red-400 font-mono">{blockedNodes?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                  <span className="text-slate-400">Blocked Roads:</span>
                  <span className="font-bold text-red-400 font-mono">{blockedEdges?.length || 0}</span>
                </div>

                {/* Disaster Generator */}
                <div className="space-y-2 border-b border-brand-border/40 pb-2">
                  <span className="text-slate-400">Simulate Disaster:</span>
                  <select 
                    value={disasterType}
                    onChange={(e) => setDisasterType(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-brand-glow transition text-slate-200"
                  >
                    <option value="">None (Manual Simulation)</option>
                    <option value="Flood">🌊 Flood (Cluster)</option>
                    <option value="Bridge Collapse">🌉 Bridge Collapse</option>
                    <option value="Road Construction">🚧 Road Construction</option>
                    <option value="Landslide">⛰️ Landslide</option>
                    <option value="Tree Fall">🌲 Tree Fall</option>
                  </select>
                </div>

                {/* Routing nodes */}
                <div className="space-y-1.5 border-b border-brand-border/40 pb-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Source:</span>
                    <span className="font-mono text-[10px] text-brand-glow max-w-[120px] truncate">
                      {simSource ? simSource : 'Click map popup'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Target:</span>
                    {emergencyLocations ? (
                      <select 
                        value={simTarget || ''}
                        onChange={(e) => setSimTarget(e.target.value || null)}
                        className="bg-brand-dark border border-brand-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-brand-glow transition text-indigo-400 max-w-[140px]"
                      >
                        <option value="">Custom (Click Map)</option>
                        <option value={emergencyLocations.hospital}>🏥 Hospital ({emergencyLocations.hospital.substring(5, 10)})</option>
                        <option value={emergencyLocations.police}>🚓 Police ({emergencyLocations.police.substring(5, 10)})</option>
                        <option value={emergencyLocations.fire_station}>🚒 Fire Station ({emergencyLocations.fire_station.substring(5, 10)})</option>
                        <option value={emergencyLocations.school}>🏫 School ({emergencyLocations.school.substring(5, 10)})</option>
                      </select>
                    ) : (
                      <span className="font-mono text-[10px] text-indigo-400 max-w-[120px] truncate">
                        {simTarget ? simTarget : 'Click map popup'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Route status */}
                {simSource && simTarget && (
                  <div className="flex items-center gap-1.5 py-1">
                    {routeFound ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-brand-glow" />
                        <span className="text-brand-glow font-medium">Bypass route found!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                        <span className="text-red-400 font-medium">Route disconnected!</span>
                      </>
                    )}
                  </div>
                )}

                {/* Sim buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onClearSimulation}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-brand-card hover:bg-brand-border text-slate-300 rounded-lg border border-brand-border transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                  <button
                    onClick={() => onTriggerSimulation(disasterType)}
                    disabled={isSimulating}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    {isSimulating ? 'Simulating...' : 'Simulate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
