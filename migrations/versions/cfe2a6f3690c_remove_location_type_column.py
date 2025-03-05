"""Remove location_type column

Revision ID: cfe2a6f3690c
Revises: d1037bdccad3
Create Date: 2025-03-05 20:43:17.955270

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cfe2a6f3690c'
down_revision = 'd1037bdccad3'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('map_location', schema=None) as batch_op:
        # Drop the default constraint
        op.execute("ALTER TABLE map_location DROP CONSTRAINT DF__map_locat__locat__656C112C")
        # Drop the location_type column
        batch_op.drop_column('location_type')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('map_location', schema=None) as batch_op:
        batch_op.add_column(sa.Column('location_type', sa.String(length=50), nullable=True))

    # ### end Alembic commands ###
