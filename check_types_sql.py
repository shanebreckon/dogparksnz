from app import app, db
from sqlalchemy import text

with app.app_context():
    # Use raw SQL to avoid GeoAlchemy issues
    result = db.session.execute(text("SELECT id, name, type FROM map_location"))
    for row in result:
        print(f"ID: {row.id}, Name: {row.name}, Type: {row.type}")
