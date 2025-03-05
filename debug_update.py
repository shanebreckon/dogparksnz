from app import app, db
from models import calculate_center_coordinates
from sqlalchemy import text
import json

def debug_update_route():
    """Debug the update route by manually updating a location and checking coordinates."""
    with app.app_context():
        # Get the most recently updated location
        location = db.session.execute(
            text('SELECT TOP 1 id, name, geometry.STAsText() as wkt FROM map_location ORDER BY updated_at DESC')
        ).fetchone()
        
        if not location:
            print("No locations found")
            return
            
        location_id = location.id
        wkt = location.wkt
        
        print(f"Processing location ID: {location_id}")
        print(f"Current WKT: {wkt[:50]}...")
        
        # Calculate center coordinates
        lat, lng = calculate_center_coordinates(wkt)
        print(f"Calculated coordinates: lat={lat}, lng={lng}")
        
        # Update the coordinates
        db.session.execute(
            text('UPDATE map_location SET lat = :lat, lng = :lng WHERE id = :id'),
            {'id': location_id, 'lat': lat, 'lng': lng}
        )
        db.session.commit()
        
        # Verify the update
        updated = db.session.execute(
            text('SELECT lat, lng FROM map_location WHERE id = :id'),
            {'id': location_id}
        ).fetchone()
        
        print(f"Updated coordinates in database: lat={updated.lat}, lng={updated.lng}")
        print("Update completed successfully")

if __name__ == '__main__':
    debug_update_route()
