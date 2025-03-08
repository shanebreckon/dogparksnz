"""
Migration script to replace the type column with location_type_id in the map_location table.

This script:
1. Creates a temporary column that allows NULL values
2. Copies all location_type_id values to this temporary column
3. Updates the NOT NULL constraint on the temporary column
4. Drops the original type column
5. Renames the temporary column to 'type'
"""
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from sqlalchemy import text

def run_migration():
    """
    Run the migration to replace type with location_type_id.
    """
    with app.app_context():
        print("Starting migration to replace type column with location_type_id...")
        
        try:
            # First verify all records have a location_type_id
            verify_sql = text("SELECT COUNT(*) as count FROM map_location WHERE location_type_id IS NULL")
            result = db.session.execute(verify_sql).fetchone()
            missing_count = result.count if result else 0
            
            if missing_count > 0:
                print(f"Error: {missing_count} locations still missing location_type_id. Run update_map_location_types.py first.")
                return
            
            # Check if the foreign key constraint already exists
            check_fk_sql = text("""
                SELECT name FROM sys.foreign_keys
                WHERE name = 'FK_map_location_location_type'
            """)
            existing_fk = db.session.execute(check_fk_sql).fetchone()
            
            # If the constraint exists, drop it
            if existing_fk:
                print("Dropping existing foreign key constraint...")
                drop_fk_sql = text("ALTER TABLE map_location DROP CONSTRAINT FK_map_location_location_type")
                db.session.execute(drop_fk_sql)
            
            # 1. Create a temporary column that allows NULL values
            print("Creating temporary column...")
            temp_column_sql = text("ALTER TABLE map_location ADD temp_type INT NULL")
            db.session.execute(temp_column_sql)
            
            # 2. Copy location_type_id values to the temporary column
            print("Copying location_type_id values to temporary column...")
            copy_values_sql = text("UPDATE map_location SET temp_type = location_type_id")
            db.session.execute(copy_values_sql)
            
            # 3. Add NOT NULL constraint to temp_type
            print("Adding NOT NULL constraint to temporary column...")
            not_null_sql = text("ALTER TABLE map_location ALTER COLUMN temp_type INT NOT NULL")
            db.session.execute(not_null_sql)
            
            # 4. Drop the original type column
            print("Dropping original type column...")
            drop_column_sql = text("ALTER TABLE map_location DROP COLUMN type")
            db.session.execute(drop_column_sql)
            
            # 5. Rename the temporary column to 'type'
            print("Renaming temporary column to 'type'...")
            rename_column_sql = text("EXEC sp_rename 'map_location.temp_type', 'type', 'COLUMN'")
            db.session.execute(rename_column_sql)
            
            # 6. Add foreign key constraint to the new type column
            print("Adding foreign key constraint to the new type column...")
            add_fk_sql = text("""
                ALTER TABLE map_location
                ADD CONSTRAINT FK_map_location_location_type
                FOREIGN KEY (type) REFERENCES location_type(id)
            """)
            db.session.execute(add_fk_sql)
            
            # 7. Drop the location_type_id column since it's now redundant
            print("Dropping redundant location_type_id column...")
            drop_location_type_id_sql = text("ALTER TABLE map_location DROP COLUMN location_type_id")
            db.session.execute(drop_location_type_id_sql)
            
            # Commit all changes
            db.session.commit()
            
            print("Successfully replaced type column with location_type_id")
            print("Migration completed successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during migration: {str(e)}")
            raise

if __name__ == "__main__":
    run_migration()
