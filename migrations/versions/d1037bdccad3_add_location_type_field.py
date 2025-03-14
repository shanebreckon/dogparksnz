"""Add location_type field

Revision ID: d1037bdccad3
Revises: 80932f59876b
Create Date: 2025-03-04 23:21:47.291624

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd1037bdccad3'
down_revision = '80932f59876b'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('map_locations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('geometry', geoalchemy2.types.Geography(srid=4326, from_text='ST_GeogFromText', name='geography', nullable=False), nullable=False),
    sa.Column('location_type', sa.String(length=50), nullable=True),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('map_locations', schema=None) as batch_op:
        batch_op.create_index('idx_map_locations_geometry', ['geometry'], unique=False, postgresql_using='gist')

    with op.batch_alter_table('map_location', schema=None) as batch_op:
        batch_op.drop_index('idx_map_location_geometry')

    op.drop_table('map_location')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('map_location',
    sa.Column('id', sa.INTEGER(), sa.Identity(always=False, start=1, increment=1), autoincrement=True, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100, collation='SQL_Latin1_General_CP1_CI_AS'), autoincrement=False, nullable=False),
    sa.Column('description', sa.VARCHAR(collation='SQL_Latin1_General_CP1_CI_AS'), autoincrement=False, nullable=True),
    sa.Column('type', sa.VARCHAR(length=50, collation='SQL_Latin1_General_CP1_CI_AS'), autoincrement=False, nullable=False),
    sa.Column('created_at', sa.DATETIME(), autoincrement=False, nullable=True),
    sa.Column('updated_at', sa.DATETIME(), autoincrement=False, nullable=True),
    sa.Column('geometry', sa.NullType(), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='PK__map_loca__3213E83FFA6FCCA1')
    )
    with op.batch_alter_table('map_location', schema=None) as batch_op:
        batch_op.create_index('idx_map_location_geometry', ['geometry'], unique=False)

    with op.batch_alter_table('map_locations', schema=None) as batch_op:
        batch_op.drop_index('idx_map_locations_geometry', postgresql_using='gist')

    op.drop_table('map_locations')
    # ### end Alembic commands ###
