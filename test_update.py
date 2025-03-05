from app import app, db
from models import calculate_center_coordinates, MapLocation
from sqlalchemy import text
import json
import sys

def test_update_coordinates():
    """Test updating coordinates for all locations."""
    with app.app_context():
        # Get all locations
        locations = db.session.execute(
            text('SELECT id, name, geometry.STAsText() as wkt FROM map_location')
        ).fetchall()
        
        print(f"Found {len(locations)} locations to update")
        
        for location in locations:
            location_id = location.id
            wkt = location.wkt
            
            # Calculate center coordinates
            lat, lng = calculate_center_coordinates(wkt)
            
            print(f"Location {location_id} ({location.name})")
            print(f"  Calculated coordinates: lat={lat}, lng={lng}")
            
            # Update coordinates directly
            update_sql = text("""
                UPDATE map_location
                SET lat = :lat, lng = :lng
                WHERE id = :id
            """)
            
            db.session.execute(update_sql, {"id": location_id, "lat": lat, "lng": lng})
            
            # Verify the update
            verify_sql = text("SELECT lat, lng FROM map_location WHERE id = :id")
            verify_result = db.session.execute(verify_sql, {"id": location_id}).fetchone()
            
            print(f"  Updated coordinates: lat={verify_result.lat}, lng={verify_result.lng}")
            print(f"  Success: {verify_result.lat == lat and verify_result.lng == lng}")
            print()
            
            # If verification fails, print detailed info
            if verify_result.lat != lat or verify_result.lng != lng:
                print(f"  ERROR: Coordinates not updated correctly!")
                print(f"  Expected: lat={lat}, lng={lng}")
                print(f"  Got: lat={verify_result.lat}, lng={verify_result.lng}")
                print(f"  Difference: lat_diff={abs(verify_result.lat - lat)}, lng_diff={abs(verify_result.lng - lng)}")
                
                # Try a more direct update
                try:
                    # Get the SQLAlchemy model instance
                    location_obj = db.session.query(MapLocation).filter_by(id=location_id).first()
                    if location_obj:
                        location_obj.lat = lat
                        location_obj.lng = lng
                        db.session.flush()
                        
                        # Re-verify
                        verify_result = db.session.execute(verify_sql, {"id": location_id}).fetchone()
                        print(f"  After direct model update: lat={verify_result.lat}, lng={verify_result.lng}")
                except Exception as e:
                    print(f"  Error during direct model update: {str(e)}")
        
        # Commit all changes
        try:
            db.session.commit()
            print("All updates committed successfully")
        except Exception as e:
            db.session.rollback()
            print(f"Error committing updates: {str(e)}")

if __name__ == '__main__':
    test_update_coordinates()
