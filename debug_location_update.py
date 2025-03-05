from app import app, db
from models import calculate_center_coordinates
from sqlalchemy import text
import json
import requests
import time

def debug_location_update():
    """Debug the location update process by simulating a frontend update."""
    with app.app_context():
        # Get the most recently updated location
        location = db.session.execute(
            text('SELECT TOP 1 id, name, description, type, geometry.STAsText() as wkt, lat, lng FROM map_location ORDER BY updated_at DESC')
        ).fetchone()
        
        if not location:
            print("No locations found")
            return
            
        location_id = location.id
        name = location.name
        description = location.description
        type_val = location.type
        wkt = location.wkt
        old_lat = location.lat
        old_lng = location.lng
        
        print(f"Processing location ID: {location_id}")
        print(f"Current coordinates: lat={old_lat}, lng={old_lng}")
        
        # Parse the WKT to create a GeoJSON object (similar to what frontend would send)
        import shapely.wkt
        from shapely.geometry import mapping
        
        geom = shapely.wkt.loads(wkt)
        geojson = mapping(geom)
        
        # Create the payload similar to what the frontend would send
        payload = {
            'name': name,
            'description': description,
            'type': type_val,
            'geometry': geojson
        }
        
        print("Sending update request with payload...")
        print(f"Payload geometry type: {geojson['type']}")
        
        # Make the request to our own API
        url = f"http://localhost:5000/api/locations/{location_id}"
        
        try:
            # Print the request we're about to make
            print(f"Making PUT request to: {url}")
            
            # Simulate what happens in the update route
            print("Simulating update route processing...")
            
            # Calculate center coordinates from the WKT
            lat, lng = calculate_center_coordinates(wkt)
            print(f"Calculated coordinates: lat={lat}, lng={lng}")
            
            # Update the database directly (similar to what the route would do)
            update_sql = text("""
                UPDATE map_location
                SET lat = :lat,
                    lng = :lng,
                    updated_at = GETDATE()
                WHERE id = :id
            """)
            
            db.session.execute(
                update_sql, 
                {
                    'id': location_id,
                    'lat': lat,
                    'lng': lng
                }
            )
            db.session.commit()
            
            # Verify the update
            updated = db.session.execute(
                text('SELECT lat, lng FROM map_location WHERE id = :id'),
                {'id': location_id}
            ).fetchone()
            
            print(f"Updated coordinates in database: lat={updated.lat}, lng={updated.lng}")
            print("Update completed successfully")
            
        except Exception as e:
            print(f"Error during update simulation: {str(e)}")

if __name__ == '__main__':
    debug_location_update()
