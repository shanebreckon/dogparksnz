from app import db
import json
from datetime import datetime

class MapDrawing(db.Model):
    """Model for storing map drawings."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    geometry = db.Column(db.Text, nullable=False)  # GeoJSON stored as text
    properties = db.Column(db.Text, nullable=True)  # Additional properties as JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'geometry': json.loads(self.geometry),
            'properties': json.loads(self.properties) if self.properties else {},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
