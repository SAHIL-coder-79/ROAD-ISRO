import React, { useState, useEffect } from 'react';
import { 
  Shield, BarChart3, Settings2, HeartPulse, Lightbulb,
  Bot, FileText, Building2, Film, Brain, Activity,
  PiggyBank, FlaskConical, Camera, Monitor, Eye,
  GitCompare, Presentation, Gauge, Bell,
  ChevronDown, ChevronRight, Menu, X
} from 'lucide-react';
import MapViewer from './components/MapViewer';
import MetricsPanel from './components/MetricsPanel';
import SimulationPanel from './components/SimulationPanel';
import HealingPanel from './components/HealingPanel';
import XaiPanel from './components/XaiPanel';
import RecommendationsPanel from './components/RecommendationsPanel';
import CopilotPanel from './components/CopilotPanel';
import ExecutiveReport from './components/ExecutiveReport';
import InfrastructurePanel from './components/InfrastructurePanel';
import DigitalTwinPanel from './components/DigitalTwinPanel';
import PredictiveAIPanel from './components/PredictiveAIPanel';
import NetworkHealthPanel from './components/NetworkHealthPanel';
import BudgetOptimizerPanel from './components/BudgetOptimizerPanel';
import ScenarioGenerator from './components/ScenarioGenerator';
import MissionPlayback from './components/MissionPlayback';
import CommandCenter from './components/CommandCenter';
import ConfidenceOverlay from './components/ConfidenceOverlay';
import CityComparison from './components/CityComparison';
import StoryMode from './components/StoryMode';
import RecoveryScorePanel from './components/RecoveryScorePanel';
import AlertSystem from './components/AlertSystem';

const FEATURE_TABS = [
  { id: 'simulation', label: 'Simulate', icon: Settings2, group: 'core' },
  { id: 'healing', label: 'Road Healing', icon: HeartPulse, group: 'core' },
  { id: 'metrics', label: 'Analytics', icon: BarChart3, group: 'core' },
  { id: 'xai', label: 'XAI', icon: Shield, group: 'core' },
  { id: 'recommendations', label: 'AI Recs', icon: Lightbulb, group: 'core' },
  { id: 'copilot', label: 'AI Copilot', icon: Bot, group: 'enterprise' },
  { id: 'infrastructure', label: 'Infrastructure', icon: Building2, group: 'enterprise' },
  { id: 'command', label: 'Command Center', icon: Monitor, group: 'enterprise' },
  { id: 'health', label: 'Network Health', icon: Activity, group: 'enterprise' },
  { id: 'predictive', label: 'Predictive AI', icon: Brain, group: 'enterprise' },
  { id: 'digitaltwin', label: 'Digital Twin', icon: Film, group: 'enterprise' },
  { id: 'scenario', label: 'Scenarios', icon: FlaskConical, group: 'enterprise' },
  { id: 'budget', label: 'Budget Opt.', icon: PiggyBank, group: 'enterprise' },
  { id: 'report', label: 'Executive Report', icon: FileText, group: 'enterprise' },
  { id: 'recovery', label: 'Recovery Score', icon: Gauge, group: 'enterprise' },
  { id: 'confidence', label: 'Confidence', icon: Eye, group: 'enterprise' },
  { id: 'comparison', label: 'City Compare', icon: GitCompare, group: 'enterprise' },
  { id: 'story', label: 'Story Mode', icon: Presentation, group: 'enterprise' },
  { id: 'playback', label: 'Mission Playback', icon: Camera, group: 'enterprise' },
  { id: 'alerts', label: 'Alert Center', icon: Bell, group: 'enterprise' },
];

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  
  const [layerConfig, setLayerConfig] = useState({
    original: true,
    segmentation: true,
    network: true,
    riskHeatmap: false,
    onChange: (layerName) => {
      setLayerConfig(prev => ({
        ...prev,
        [layerName]: !prev[layerName]
      }));
    }
  });

  const [simulationMode, setSimulationMode] = useState(false);
  const [blockedNodes, setBlockedNodes] = useState([]);
  const [blockedEdges, setBlockedEdges] = useState([]);
  const [simCentralities, setSimCentralities] = useState(null);
  const [simSource, setSimSource] = useState(null);
  const [simTarget, setSimTarget] = useState(null);
  const [simResults, setSimResults] = useState(null);
  const [alternateRoute, setAlternateRoute] = useState([]);
  const [routeFound, setRouteFound] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [emergencyLocations, setEmergencyLocations] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  const [healingStage, setHealingStage] = useState('original');
  const [healingEdges, setHealingEdges] = useState([]);
  const [healingMetrics, setHealingMetrics] = useState(null);
  const [isHealing, setIsHealing] = useState(false);
  
  const [xaiRoad, setXaiRoad] = useState(null);
  const [activeTab, setActiveTab] = useState('simulation');

  const [enterpriseExpanded, setEnterpriseExpanded] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedProject.geojson_network) {
      try {
        const parsed = JSON.parse(selectedProject.geojson_network);
        const junctions = parsed.features.filter(f => f.properties.type === 'junction');
        junctions.sort((a, b) => (b.properties.metrics?.betweenness || 0) - (a.properties.metrics?.betweenness || 0));
        
        if (junctions.length >= 4) {
          setEmergencyLocations({
            hospital: junctions[0].properties.id,
            police: junctions[1].properties.id,
            fire_station: junctions[2].properties.id,
            school: junctions[3].properties.id
          });
        } else {
          setEmergencyLocations(null);
        }
      } catch (err) {
        console.error("Failed to parse geojson for emergencies", err);
      }
    } else {
      setEmergencyLocations(null);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
          setSelectedProject(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/advanced/alerts/0');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setAlerts(data);
      }
    } catch (err) {}
  };

  const handleSelectProject = (id) => {
    setSelectedProjectId(id);
    const proj = projects.find(p => p.id === id);
    setSelectedProject(proj);
    handleClearSimulation();
  };

  const handleUploadImage = (newProject) => {
    setProjects(prev => [...prev, newProject]);
    setSelectedProjectId(newProject.id);
    setSelectedProject(newProject);
    handleClearSimulation();
  };

  const handleToggleBlockNode = (nodeId) => {
    setBlockedNodes(prev => {
      if (prev.includes(nodeId)) return prev.filter(n => n !== nodeId);
      else return [...prev, nodeId];
    });
  };

  const handleSelectRouteNode = (type, nodeId) => {
    if (type === 'source') setSimSource(nodeId);
    else setSimTarget(nodeId);
  };

  const handleClearSimulation = () => {
    setBlockedNodes([]);
    setBlockedEdges([]);
    setSimCentralities(null);
    setSimSource(null);
    setSimTarget(null);
    setSimResults(null);
    setAlternateRoute([]);
    setRouteFound(false);
  };

  const handleTriggerSimulation = async (disasterType = null) => {
    if (!selectedProjectId) return;
    setIsSimulating(true);
    try {
      const response = await fetch(`/api/projects/${selectedProjectId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked_nodes: blockedNodes,
          blocked_edges: blockedEdges,
          source_node: simSource,
          target_node: simTarget,
          disaster_type: disasterType
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSimResults(data);
        setAlternateRoute(data.alternate_route || []);
        setRouteFound(data.route_found || false);
        if (data.blocked_nodes) setBlockedNodes(data.blocked_nodes);
        if (data.blocked_edges) setBlockedEdges(data.blocked_edges);
        if (data.updated_metrics) setSimCentralities(data.updated_metrics);
      }
    } catch (err) {
      console.error("Error simulating blockages:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleStartHealing = async () => {
    if (!selectedProjectId) return;
    setIsHealing(true);
    setHealingStage('broken');
    try {
      const response = await fetch(`/api/projects/${selectedProjectId}/heal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_nodes: blockedNodes, blocked_edges: blockedEdges })
      });
      if (response.ok) {
        const data = await response.json();
        setTimeout(() => {
          setHealingStage('healing');
          setHealingEdges(data.healing_edges || []);
          setTimeout(() => {
            setHealingStage('connected');
            setHealingMetrics(data.metrics || null);
            setIsHealing(false);
          }, 2200);
        }, 1200);
      } else {
        setIsHealing(false);
        setHealingStage('original');
      }
    } catch (err) {
      console.error("Error running road healing:", err);
      setIsHealing(false);
      setHealingStage('original');
    }
  };

  const handleResetHealing = () => {
    setHealingStage('original');
    setHealingEdges([]);
    setHealingMetrics(null);
  };

  const handleCopilotAction = (actions) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'open_simulation': setActiveTab('simulation'); break;
        case 'open_recommendations': setActiveTab('recommendations'); break;
        case 'show_health': setActiveTab('health'); setEnterpriseExpanded(true); break;
        case 'simulate_disaster': setActiveTab('simulation'); handleTriggerSimulation(action.disaster); break;
        case 'generate_report': setActiveTab('report'); setEnterpriseExpanded(true); break;
        case 'show_emergency_routes': setActiveTab('simulation'); break;
        default: break;
      }
    });
  };

  const renderPanel = () => {
    switch (activeTab) {
      case 'simulation':
        return <SimulationPanel
          projects={projects} selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject} onUploadImage={handleUploadImage}
          simulationMode={simulationMode} setSimulationMode={setSimulationMode}
          blockedNodes={blockedNodes} blockedEdges={blockedEdges}
          onClearSimulation={handleClearSimulation} onTriggerSimulation={handleTriggerSimulation}
          simSource={simSource} simTarget={simTarget} setSimTarget={setSimTarget}
          emergencyLocations={emergencyLocations} routeFound={routeFound} isSimulating={isSimulating}
        />;
      case 'healing':
        return <HealingPanel project={selectedProject} blockedNodes={blockedNodes}
          healingStage={healingStage} setHealingStage={setHealingStage}
          healingMetrics={healingMetrics} onStartHealing={handleStartHealing}
          onResetHealing={handleResetHealing} isHealing={isHealing}
        />;
      case 'xai':
        return <XaiPanel project={selectedProject} xaiRoad={xaiRoad} onClear={() => setXaiRoad(null)} />;
      case 'recommendations':
        return <RecommendationsPanel project={selectedProject} />;
      case 'copilot':
        return <CopilotPanel projectId={selectedProjectId} onCopilotAction={handleCopilotAction} />;
      case 'infrastructure':
        return <InfrastructurePanel project={selectedProject} />;
      case 'command':
        return <CommandCenter project={selectedProject} alerts={alerts} />;
      case 'health':
        return <NetworkHealthPanel project={selectedProject} />;
      case 'predictive':
        return <PredictiveAIPanel project={selectedProject} />;
      case 'digitaltwin':
        return <DigitalTwinPanel project={selectedProject} />;
      case 'scenario':
        return <ScenarioGenerator project={selectedProject} onScenarioResults={(data) => {
          if (data?.blocked_nodes) setBlockedNodes(data.blocked_nodes);
          if (data?.results) setSimResults(data.results);
        }} />;
      case 'budget':
        return <BudgetOptimizerPanel project={selectedProject} />;
      case 'report':
        return <ExecutiveReport project={selectedProject} />;
      case 'recovery':
        return <RecoveryScorePanel project={selectedProject} />;
      case 'confidence':
        return <ConfidenceOverlay project={selectedProject} />;
      case 'comparison':
        return <CityComparison projects={projects} />;
      case 'story':
        return <StoryMode project={selectedProject} />;
      case 'playback':
        return <MissionPlayback project={selectedProject} />;
      case 'alerts':
        return <AlertSystem project={selectedProject} />;
      default:
        return <MetricsPanel project={selectedProject} simResults={simResults}
          blockedNodes={blockedNodes} simCentralities={simCentralities}
          healingMetrics={healingMetrics} emergencyLocations={emergencyLocations}
        />;
    }
  };

  const isEnterprise = FEATURE_TABS.find(t => t.id === activeTab)?.group === 'enterprise';

  return (
    <div className="flex flex-col h-full w-full bg-brand-dark text-slate-100 font-sans bg-telemetry-grid relative overflow-hidden">
      
      <header className="flex justify-between items-center px-4 lg:px-6 py-3 border-b border-brand-border bg-brand-panel/90 backdrop-blur relative z-10">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-glow to-transparent opacity-50"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-glow/10 border-2 border-brand-glow flex items-center justify-center glow-shadow relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-brand-glow/20 animate-scanline"></div>
            <Shield className="w-5 h-5 text-brand-glow relative z-10" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm lg:text-xl font-bold font-display uppercase tracking-[0.2em] text-slate-100 flex items-center gap-2">
              ROADSHIELD <span className="text-brand-glow font-mono font-medium text-[10px] px-2 py-0.5 border border-brand-glow/30 rounded bg-brand-glow/10">v2.0</span>
            </h1>
            <p className="text-[8px] lg:text-[10px] text-brand-accent uppercase tracking-[0.3em] font-bold">ISRO GeoAI Telemetry System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-[10px] font-mono font-bold text-slate-400">
            <div className="flex flex-col items-end">
              <span className="text-[7px] uppercase tracking-wider text-slate-500">System</span>
              <span className="flex items-center gap-1.5 text-brand-glow">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-glow animate-pulse-glow"></span>
                ONLINE
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[7px] uppercase tracking-wider text-slate-500">Alerts</span>
              <span className="text-amber-400">{alerts.length}</span>
            </div>
          </div>
          <button onClick={() => setShowMobileNav(!showMobileNav)} className="md:hidden p-1.5 text-slate-400 hover:text-white">
            {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 lg:p-6 gap-3 lg:gap-6 relative">
        
        <section className="flex-1 h-[40vh] lg:h-full relative min-h-[300px]">
          <MapViewer 
            project={selectedProject} 
            layerConfig={layerConfig}
            simulationMode={simulationMode}
            blockedNodes={blockedNodes}
            blockedEdges={blockedEdges}
            simCentralities={simCentralities}
            emergencyLocations={emergencyLocations}
            onToggleBlockNode={handleToggleBlockNode}
            simSource={simSource}
            simTarget={simTarget}
            onSelectRouteNode={handleSelectRouteNode}
            alternateRoute={alternateRoute}
            healingStage={healingStage}
            healingEdges={healingEdges}
            onAnalyzeXai={(road) => {
              setXaiRoad(road);
              setActiveTab('xai');
            }}
          />
        </section>

        <aside className={`lg:w-[420px] h-full flex flex-col glass-panel rounded-2xl border border-brand-border overflow-hidden transition-all ${
          showMobileNav ? 'fixed inset-0 z-50 rounded-none' : ''
        }`}>
          <div className="flex overflow-x-auto border-b border-brand-border bg-brand-panel/30 scrollbar-hide">
            {FEATURE_TABS.filter(t => t.group === 'core').map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowMobileNav(false); }}
                  className={`px-3 py-2.5 text-[9px] lg:text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                    activeTab === tab.id 
                      ? 'border-b-2 border-brand-glow text-brand-glow bg-brand-glow/5' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setEnterpriseExpanded(!enterpriseExpanded)}
              className={`px-3 py-2.5 text-[9px] lg:text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                isEnterprise ? 'text-brand-glow border-b-2 border-brand-glow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {enterpriseExpanded ? <ChevronDown className="w-3 h-4" /> : <ChevronRight className="w-3 h-4" />}
              <span className="hidden sm:inline">Enterprise</span>
              <span className="text-[7px] px-1 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono">+{FEATURE_TABS.filter(t => t.group === 'enterprise').length}</span>
            </button>
          </div>

          {enterpriseExpanded && (
            <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-brand-border bg-brand-dark/20">
              {FEATURE_TABS.filter(t => t.group === 'enterprise').map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setShowMobileNav(false); }}
                    className={`flex items-center gap-1 px-2 py-1 text-[8px] lg:text-[10px] font-medium rounded-lg border transition ${
                      isActive 
                        ? 'bg-brand-glow/10 border-brand-glow/30 text-brand-glow' 
                        : 'bg-brand-card border-brand-border text-slate-400 hover:text-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-3 lg:p-4 custom-scrollbar">
              {renderPanel()}
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}
