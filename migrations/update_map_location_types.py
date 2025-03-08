"""
Migration script to update the map_location table to use location_type_id.

This script ensures all existing map_location records have the proper location_type_id
based on their type field.
"""
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import LocationType
from sqlalchemy import text

def run_migration():
    """
    Run the migration to update map_location records to use location_type_id.
    """
    with app.app_context():
        print("Starting migration to update map_location records with location_type_id...")
        
        # Get all location types
        location_types = LocationType.query.all()
        if not location_types:
            print("Error: No location types found. Please run create_location_type_table.py first.")
            return
        
        # Create a mapping of type names to IDs
        type_to_id = {lt.short_name: lt.id for lt in location_types}
        print(f"Found location types: {type_to_id}")
        
        # Count locations without location_type_id
        count_sql = text("SELECT COUNT(*) as count FROM map_location WHERE location_type_id IS NULL")
        result = db.session.execute(count_sql).fetchone()
        missing_count = result.count if result else 0
        print(f"Found {missing_count} locations without location_type_id")
        
        # Update each location type
        for type_name, type_id in type_to_id.items():
            update_sql = text("""
                UPDATE map_location
                SET location_type_id = :type_id
                WHERE type = :type_name AND (location_type_id IS NULL OR location_type_id != :type_id)
            """)
            
            result = db.session.execute(update_sql, {"type_id": type_id, "type_name": type_name})
            db.session.commit()
            print(f"Updated {result.rowcount} locations with type '{type_name}' to location_type_id {type_id}")
        
        # Verify all locations have a location_type_id
        verify_sql = text("SELECT COUNT(*) as count FROM map_location WHERE location_type_id IS NULL")
        result = db.session.execute(verify_sql).fetchone()
        still_missing = result.count if result else 0
        
        if still_missing > 0:
            print(f"Warning: {still_missing} locations still missing location_type_id")
            
            # Check what types are missing
            missing_types_sql = text("SELECT DISTINCT type FROM map_location WHERE location_type_id IS NULL")
            missing_types = db.session.execute(missing_types_sql).fetchall()
            if missing_types:
                print("Missing location types:")
                for row in missing_types:
                    print(f"  - '{row.type}'")
        else:
            print("All locations now have a location_type_id")
        
        print("Migration completed successfully")

if __name__ == "__main__":
    run_migration()
