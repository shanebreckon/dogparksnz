from app import app, db
from models import MapLocation, calculate_center_coordinates
from sqlalchemy import text
import shapely.wkt

def update_center_coordinates():
    """Update center coordinates for all existing locations."""
    with app.app_context():
        # Get all locations
        locations = db.session.execute(text('SELECT id, geometry.STAsText() as wkt FROM map_location')).fetchall()
        
        count = 0
        for loc in locations:
            # Calculate center coordinates
            lat, lng = calculate_center_coordinates(loc.wkt)
            
            # Update the location
            db.session.execute(
                text('UPDATE map_location SET lat = :lat, lng = :lng WHERE id = :id'), 
                {'id': loc.id, 'lat': lat, 'lng': lng}
            )
            count += 1
        
        # Commit all changes
        db.session.commit()
        print(f'Updated {count} locations with center coordinates')

if __name__ == '__main__':
    update_center_coordinates()
