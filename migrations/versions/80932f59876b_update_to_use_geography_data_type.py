"""Update to use Geography data type

Revision ID: 80932f59876b
Revises: f2a8fcde7cd4
Create Date: 2025-03-04 22:27:07.761974

"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2.types


# revision identifiers, used by Alembic.
revision = '80932f59876b'
down_revision = 'f2a8fcde7cd4'
branch_labels = None
depends_on = None


def upgrade():
    # Add the new geography column
    op.execute("ALTER TABLE map_location ADD geometry_geo geography NULL")
    
    # Update the new column with default data
    op.execute("UPDATE map_location SET geometry_geo = geography::STGeomFromText('POINT(0 0)', 4326) WHERE geometry IS NOT NULL")
    
    # Drop the original column
    op.execute("ALTER TABLE map_location DROP COLUMN geometry")
    
    # Rename the new column
    op.execute("EXEC sp_rename 'map_location.geometry_geo', 'geometry', 'COLUMN'")
    
    # Add a spatial index
    op.execute("CREATE SPATIAL INDEX [idx_map_location_geometry] ON map_location(geometry)")


def downgrade():
    # Add a temporary text column
    op.execute("ALTER TABLE map_location ADD geometry_text VARCHAR(MAX) NULL")
    
    # Update with default GeoJSON
    op.execute("UPDATE map_location SET geometry_text = '{\"type\":\"Point\",\"coordinates\":[0,0]}' WHERE geometry IS NOT NULL")
    
    # Drop the spatial index
    op.execute("DROP INDEX [idx_map_location_geometry] ON map_location")
    
    # Drop the geography column
    op.execute("ALTER TABLE map_location DROP COLUMN geometry")
    
    # Rename the text column
    op.execute("EXEC sp_rename 'map_location.geometry_text', 'geometry', 'COLUMN'")
