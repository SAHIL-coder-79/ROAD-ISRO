# RoadShield AI - Geospatial Resilience Sandbox 🛡️🛰️

RoadShield AI is a full-stack, AI-powered geospatial web application designed to extract road networks from satellite imagery, convert them into routable topological graphs, calculate centrality vulnerability metrics, and simulate failures (e.g., blockages from disasters or blockades) to evaluate urban resilience in real time.

---

## Technical Features

1. **AI Road Segmentation**: Preprocesses input satellite imagery (rescaling, L-channel CLAHE contrast normalization, shadow suppression) and applies PyTorch semantic segmentation, falling back to adaptive OpenCV ridge-detection filters if no pre-trained weights are present.
2. **Topological Graph Conversion**: Converts binary road masks into single-pixel wide skeletons via `scikit-image`, and builds coordinate-projected NetworkX graphs. Re-samples paths and contracts degree-2 nodes to yield simplified junction-road structures.
3. **Vulnerability Analysis**: Computes Degree Centrality, Closeness Centrality, and Betweenness Centrality. Automatically flags bottleneck edges and critical intersections.
4. **Sandbox Simulation**: Allows users to dynamically select roads and junctions to mock blockages and measure LCC (Largest Connected Component) resilience drop, alternate routing, and fragmentation.
5. **GIS Interface**: Features Leaflet maps with dark themes, visual node size/color mapping based on centrality, and alternate path animations.

---

## Directory Structure

```
roadshield-ai/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── unet.py
│   │   │   └── road_extractor.py
│   │   ├── routes/
│   │   │   └── project.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── graph_analysis.py
│   │   ├── main.py
│   │   └── schemas.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapViewer.jsx
│   │   │   ├── MetricsPanel.jsx
│   │   │   └── SimulationPanel.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## Setup & Running Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Run Backend Server
From the root of the project:
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python app/main.py
```
*The FastAPI backend will start at `http://localhost:8000`.*

### 2. Run Frontend Dashboard
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The React client will start at `http://localhost:3000` (automatically proxied to backend API).*

---

## Getting Started: Mock Data
We have provided a script `create_mock_satellite.py` (which runs automatically on first upload or backend init if desired) to generate a sample high-contrast satellite image resembling a grid city with trees. You can upload this directly inside the web dashboard to see extraction and simulation in action immediately!
