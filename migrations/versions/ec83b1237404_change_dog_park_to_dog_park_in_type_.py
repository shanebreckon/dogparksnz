"""Change 'dog park' to 'dog_park' in type column

Revision ID: ec83b1237404
Revises: cfe2a6f3690c
Create Date: 2025-03-05 20:46:27.058922

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ec83b1237404'
down_revision = 'cfe2a6f3690c'
branch_labels = None
depends_on = None


def upgrade():
    # Update entries in the type column from 'dog park' to 'dog_park'
    op.execute("UPDATE map_location SET type = 'dog_park' WHERE type = 'dog park'")


def downgrade():
    # Revert entries in the type column from 'dog_park' back to 'dog park'
    op.execute("UPDATE map_location SET type = 'dog park' WHERE type = 'dog_park'")
