"""
Migration script to create the location_type table and update the map_location table.
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
    Run the migration to create the location_type table and add initial data.
    """
    with app.app_context():
        # Create the location_type table
        db.create_all()
        
        # Check if the location_type table is empty
        location_types = LocationType.query.all()
        if not location_types:
            # Add initial location types
            dog_park = LocationType(
                short_name='dog_park',  # Using underscore format as per memory
                icon='pets',
                color='#2E7D32'  # Dark green
            )
            
            vet = LocationType(
                short_name='vet',
                icon='local_hospital',
                color='#1565C0'  # Blue
            )
            
            db.session.add(dog_park)
            db.session.add(vet)
            db.session.commit()
            
            print("Added initial location types: dog_park and vet")
        else:
            print("Location types already exist, skipping initial data")
        
        # Check if the location_type_id column exists in map_location
        try:
            # Try to select from the column to check if it exists
            db.session.execute(text("SELECT location_type_id FROM map_location LIMIT 1"))
            print("location_type_id column already exists")
        except Exception:
            # Column doesn't exist, add it
            print("Adding location_type_id column to map_location table")
            db.session.execute(text("""
                ALTER TABLE map_location 
                ADD location_type_id INT NULL
            """))
            db.session.commit()
            
            # Add foreign key constraint
            db.session.execute(text("""
                ALTER TABLE map_location 
                ADD CONSTRAINT FK_map_location_location_type 
                FOREIGN KEY (location_type_id) 
                REFERENCES location_type(id)
            """))
            db.session.commit()
            
            print("Added location_type_id column and foreign key constraint")
        
        # Update existing records to set location_type_id based on type
        print("Updating existing records with location_type_id")
        db.session.execute(text("""
            UPDATE map_location
            SET location_type_id = (SELECT id FROM location_type WHERE short_name = map_location.type)
            WHERE map_location.location_type_id IS NULL
        """))
        db.session.commit()
        
        print("Migration completed successfully")

if __name__ == "__main__":
    run_migration()
