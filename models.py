from app import db
from datetime import datetime
from geoalchemy2 import Geography
from shapely.geometry import mapping, shape as shapely_shape, Point, LineString, Polygon
from sqlalchemy import text
import shapely.wkt

class MapLocation(db.Model):
    """Model for storing map locations."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    geometry = db.Column(Geography(geometry_type='GEOMETRY', srid=4326), nullable=False)  # Using Geography type
    type = db.Column(db.String(50), nullable=False)  # Type of location (e.g., dog_park)
    lat = db.Column(db.Float, nullable=True)  # Latitude of the center point
    lng = db.Column(db.Float, nullable=True)  # Longitude of the center point
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
                    'lat': self.lat,
                    'lng': self.lng,
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
                    'lat': self.lat,
                    'lng': self.lng,
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
                'lat': self.lat,
                'lng': self.lng,
                'error': str(e),
                'created_at': self.created_at.isoformat(),
                'updated_at': self.updated_at.isoformat()
            }

def calculate_center_coordinates(geometry_wkt):
    """
    Calculate the center coordinates for different geometry types.
    
    Args:
        geometry_wkt: WKT representation of the geometry
        
    Returns:
        tuple: (latitude, longitude) of the center point
    """
    try:
        # Parse the WKT to a shapely geometry
        geom = shapely.wkt.loads(geometry_wkt)
        
        if geom.geom_type == 'Point':
            # For points, use the coordinates directly
            return (geom.y, geom.x)
        
        elif geom.geom_type == 'LineString':
            # For linestrings, use the midpoint along the line
            if len(geom.coords) >= 2:
                # Calculate the midpoint of the line by interpolating at 0.5 distance
                midpoint = geom.interpolate(0.5, normalized=True)
                return (midpoint.y, midpoint.x)
            else:
                # Fallback to centroid for invalid linestrings
                centroid = geom.centroid
                return (centroid.y, centroid.x)
        
        else:
            # For polygons and other geometries, use the centroid
            centroid = geom.centroid
            return (centroid.y, centroid.x)
            
    except Exception as e:
        print(f"Error calculating center coordinates: {str(e)}")
        return (None, None)