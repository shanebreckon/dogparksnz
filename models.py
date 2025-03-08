from app import db
from datetime import datetime
from geoalchemy2 import Geography
from shapely.geometry import mapping, shape as shapely_shape, Point, LineString, Polygon
from sqlalchemy import text
import shapely.wkt
from shapely import wkb

class LocationType(db.Model):
    """Model for storing location types."""
    id = db.Column(db.Integer, primary_key=True)
    short_name = db.Column(db.String(50), nullable=False, unique=True)  # e.g., dog_park, vet
    icon = db.Column(db.String(50), nullable=False)  # Material design icon name
    color = db.Column(db.String(20), nullable=False)  # Color code (hex or name)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'short_name': self.short_name,
            'icon': self.icon,
            'color': self.color,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class MapLocation(db.Model):
    """Model for map locations."""
    __tablename__ = 'map_location'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    geometry = db.Column(Geography(geometry_type='GEOMETRY', srid=4326), nullable=False)
    type = db.Column(db.Integer, db.ForeignKey('location_type.id'), nullable=False)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to LocationType
    location_type = db.relationship('LocationType', foreign_keys=[type])
    
    # Add custom query loading to avoid using ST_AsBinary
    __mapper_args__ = {
        'exclude_properties': ['geometry']
    }
    
    def to_dict(self):
        """Convert the model to a dictionary."""
        # Get location type information
        location_type_info = None
        if self.location_type:
            location_type_info = {
                'id': self.location_type.id,
                'short_name': self.location_type.short_name,
                'icon': self.location_type.icon,
                'color': self.location_type.color
            }
        
        # Get the geometry data using SQL Server's specific functions
        try:
            # Use SQL Server's specific functions to get the geometry as WKT
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
                    'type': self.type,  # This is now the numeric ID
                    'location_type': location_type_info,
                    'lat': self.lat,
                    'lng': self.lng,
                    'created_at': self.created_at.isoformat() if self.created_at else None,
                    'updated_at': self.updated_at.isoformat() if self.updated_at else None
                }
            else:
                # No geometry found
                return {
                    'id': self.id,
                    'name': self.name,
                    'description': self.description,
                    'type': self.type,
                    'location_type': location_type_info,
                    'lat': self.lat,
                    'lng': self.lng,
                    'error': "No geometry data found",
                    'created_at': self.created_at.isoformat() if self.created_at else None,
                    'updated_at': self.updated_at.isoformat() if self.updated_at else None
                }
        except Exception as e:
            # Return a simplified dictionary without the geometry if there's an error
            return {
                'id': self.id,
                'name': self.name,
                'description': self.description,
                'type': self.type,
                'location_type': location_type_info,
                'lat': self.lat,
                'lng': self.lng,
                'error': str(e),
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }

def calculate_center_coordinates(geometry):
    """
    Calculate the center coordinates for different geometry types.
    
    Args:
        geometry: GeoJSON geometry or WKT representation of the geometry
        
    Returns:
        tuple: (latitude, longitude) of the center point
    """
    try:
        # Check if we have a GeoJSON object
        if isinstance(geometry, dict):
            # Handle FeatureCollection
            if 'type' in geometry and geometry['type'].lower() == 'featurecollection':
                if 'features' in geometry and len(geometry['features']) > 0:
                    # Use the first feature's geometry
                    feature = geometry['features'][0]
                    if 'geometry' in feature:
                        geom = shapely_shape(feature['geometry'])
                    else:
                        # If no geometry in feature, try to use the feature itself
                        geom = shapely_shape(feature)
                else:
                    # Empty feature collection
                    return (None, None)
            # Handle Feature
            elif 'type' in geometry and geometry['type'].lower() == 'feature':
                if 'geometry' in geometry:
                    geom = shapely_shape(geometry['geometry'])
                else:
                    # No geometry in feature
                    return (None, None)
            # Handle direct geometry object
            else:
                geom = shapely_shape(geometry)
        # Check if we have a WKT string
        elif isinstance(geometry, str):
            geom = shapely.wkt.loads(geometry)
        else:
            # Unknown type
            raise ValueError(f"Unknown geometry type: {type(geometry)}")
        
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