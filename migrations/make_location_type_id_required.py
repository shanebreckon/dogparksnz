"""
Migration script to make the location_type_id field required in the map_location table.

This script updates the map_location table to make the location_type_id column NOT NULL,
ensuring that all locations must have a valid location type.
"""
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from sqlalchemy import text

def run_migration():
    """
    Run the migration to make location_type_id required.
    """
    with app.app_context():
        print("Starting migration to make location_type_id required...")
        
        try:
            # First verify all records have a location_type_id
            verify_sql = text("SELECT COUNT(*) as count FROM map_location WHERE location_type_id IS NULL")
            result = db.session.execute(verify_sql).fetchone()
            missing_count = result.count if result else 0
            
            if missing_count > 0:
                print(f"Error: {missing_count} locations still missing location_type_id. Run update_map_location_types.py first.")
                return
            
            # Alter the table to make location_type_id NOT NULL
            alter_sql = text("""
                ALTER TABLE map_location
                ALTER COLUMN location_type_id INT NOT NULL
            """)
            
            db.session.execute(alter_sql)
            db.session.commit()
            
            print("Successfully made location_type_id required (NOT NULL)")
            
            # Update the model in SQLAlchemy's metadata
            print("Migration completed successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during migration: {str(e)}")
            raise

if __name__ == "__main__":
    run_migration()
