from app import db
from datetime import datetime
from geoalchemy2 import Geography
from shapely.geometry import mapping, shape as shapely_shape
from sqlalchemy import text
import shapely.wkt

class MapLocation(db.Model):
    """Model for storing map locations."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    geometry = db.Column(Geography(geometry_type='GEOMETRY', srid=4326), nullable=False)  # Using Geography type
    type = db.Column(db.String(50), nullable=False)  # Type of location (e.g., dog_park)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        try:
            # Get the WKT representation directly from SQL Server
            sql = text("SELECT geometry.STAsText() as wkt FROM map_location WHERE id = :id")
            result = db.session.execute(sql, {"id": self.id}).fetchone()
            
            if result and result.wkt:
                # Convert WKT to Shapely geometry
                geom = shapely.wkt.loads(result.wkt)
                
                # Convert to GeoJSON
                geojson = mapping(geom)
                
                return {
                    'id': self.id,
                    'name': self.name,
                    'description': self.description,
                    'geometry': geojson,
                    'type': self.type,
                    'created_at': self.created_at.isoformat(),
                    'updated_at': self.updated_at.isoformat()
                }
            else:
                # No geometry found
                return {
                    'id': self.id,
                    'name': self.name,
                    'description': self.description,
                    'type': self.type,
                    'error': "No geometry data found",
                    'created_at': self.created_at.isoformat(),
                    'updated_at': self.updated_at.isoformat()
                }
        except Exception as e:
            # Return a simplified dictionary without the geometry if there's an error
            return {
                'id': self.id,
                'name': self.name,
                'description': self.description,
                'type': self.type,
                'error': str(e),
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat()
            }