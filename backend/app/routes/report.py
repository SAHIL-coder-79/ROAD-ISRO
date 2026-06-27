import json
import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db, Project
from datetime import datetime

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter(prefix="/report", tags=["report"])

def _get_project_data(project_id: int, db: Session):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        network_data = json.loads(project.geojson_network)
        features = network_data.get("features", [])
        
        nodes = [f for f in features if f.get("properties", {}).get("type") == "junction"]
        edges = [f for f in features if f.get("properties", {}).get("type") == "road"]
        
        return {
            "project_name": project.name,
            "created_at": project.created_at.strftime("%Y-%m-%d %H:%M:%S") if project.created_at else "N/A",
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "nodes": nodes,
            "edges": edges,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse project data: {str(e)}")

@router.get("/json/{project_id}")
def export_json(project_id: int, db: Session = Depends(get_db)):
    data = _get_project_data(project_id, db)
    
    # Sort edges by criticality for the report
    sorted_edges = sorted(
        data["edges"], 
        key=lambda e: e.get("properties", {}).get("criticality", 0), 
        reverse=True
    )
    
    report_data = {
        "summary": {
            "project_name": data["project_name"],
            "generated_on": datetime.utcnow().isoformat(),
            "total_junctions": data["total_nodes"],
            "total_roads": data["total_edges"]
        },
        "critical_roads": [
            {
                "source": e["properties"]["source"],
                "target": e["properties"]["target"],
                "criticality": e["properties"].get("criticality", 0),
                "betweenness": e["properties"].get("betweenness", 0),
                "is_bridge": e["properties"].get("is_bridge", False)
            }
            for e in sorted_edges[:50] # Top 50
        ]
    }
    
    return Response(
        content=json.dumps(report_data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=roadshield_report_{project_id}.json"}
    )

@router.get("/csv/{project_id}")
def export_csv(project_id: int, db: Session = Depends(get_db)):
    data = _get_project_data(project_id, db)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Source Node", "Target Node", "Criticality Score", "Betweenness Centrality", "Is Bridge"])
    
    sorted_edges = sorted(
        data["edges"], 
        key=lambda e: e.get("properties", {}).get("criticality", 0), 
        reverse=True
    )
    
    for edge in sorted_edges:
        props = edge.get("properties", {})
        writer.writerow([
            props.get("source"),
            props.get("target"),
            round(props.get("criticality", 0), 4) if isinstance(props.get("criticality"), (int, float)) else 0,
            round(props.get("betweenness", 0), 4) if isinstance(props.get("betweenness"), (int, float)) else 0,
            "Yes" if props.get("is_bridge") else "No"
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=roadshield_report_{project_id}.csv"}
    )

@router.get("/pdf/{project_id}")
def export_pdf(project_id: int, db: Session = Depends(get_db)):
    data = _get_project_data(project_id, db)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    title_style = styles['Heading1']
    title_style.alignment = 1 # Center
    
    heading2 = styles['Heading2']
    normal = styles['Normal']
    
    elements = []
    
    elements.append(Paragraph(f"Executive Report: {data['project_name']}", title_style))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("Project Summary", heading2))
    elements.append(Paragraph(f"<b>Generated On:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC", normal))
    elements.append(Paragraph(f"<b>Total Junctions:</b> {data['total_nodes']}", normal))
    elements.append(Paragraph(f"<b>Total Roads:</b> {data['total_edges']}", normal))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("Top Critical Roads", heading2))
    elements.append(Spacer(1, 10))
    
    sorted_edges = sorted(
        data["edges"], 
        key=lambda e: e.get("properties", {}).get("criticality", 0), 
        reverse=True
    )[:20]
    
    table_data = [["Source", "Target", "Criticality", "Betweenness", "Bridge"]]
    for edge in sorted_edges:
        props = edge.get("properties", {})
        crit = props.get("criticality", 0)
        bet = props.get("betweenness", 0)
        table_data.append([
            str(props.get("source"))[:8] + "..",
            str(props.get("target"))[:8] + "..",
            str(round(crit, 4)) if isinstance(crit, (int, float)) else "0",
            str(round(bet, 4)) if isinstance(bet, (int, float)) else "0",
            "Yes" if props.get("is_bridge") else "No"
        ])
        
    t = Table(table_data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor("#0f172a")),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1"))
    ]))
    
    elements.append(t)
    
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=roadshield_report_{project_id}.pdf"}
    )
