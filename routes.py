from app import app, db
from flask import render_template, request, jsonify
from models import MapDrawing
import json

@app.route('/')
def index():
    """Render the main page with the map."""
    return render_template('index.html')

@app.route('/api/drawings', methods=['GET'])
def get_drawings():
    """Get all map drawings."""
    drawings = MapDrawing.query.all()
    return jsonify([drawing.to_dict() for drawing in drawings])

@app.route('/api/drawings', methods=['POST'])
def create_drawing():
    """Create a new map drawing."""
    data = request.json
    
    new_drawing = MapDrawing(
        name=data.get('name', 'Unnamed Drawing'),
        description=data.get('description', ''),
        geometry=json.dumps(data.get('geometry', {})),
        properties=json.dumps(data.get('properties', {}))
    )
    
    db.session.add(new_drawing)
    db.session.commit()
    
    return jsonify(new_drawing.to_dict()), 201

@app.route('/api/drawings/<int:drawing_id>', methods=['GET'])
def get_drawing(drawing_id):
    """Get a specific drawing by ID."""
    drawing = MapDrawing.query.get_or_404(drawing_id)
    return jsonify(drawing.to_dict())

@app.route('/api/drawings/<int:drawing_id>', methods=['PUT'])
def update_drawing(drawing_id):
    """Update a specific drawing."""
    drawing = MapDrawing.query.get_or_404(drawing_id)
    data = request.json
    
    if 'name' in data:
        drawing.name = data['name']
    if 'description' in data:
        drawing.description = data['description']
    if 'geometry' in data:
        drawing.geometry = json.dumps(data['geometry'])
    if 'properties' in data:
        drawing.properties = json.dumps(data['properties'])
    
    db.session.commit()
    return jsonify(drawing.to_dict())

@app.route('/api/drawings/<int:drawing_id>', methods=['DELETE'])
def delete_drawing(drawing_id):
    """Delete a specific drawing."""
    drawing = MapDrawing.query.get_or_404(drawing_id)
    db.session.delete(drawing)
    db.session.commit()
    return '', 204
