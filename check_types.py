from app import app, db
from models import MapLocation

with app.app_context():
    locations = MapLocation.query.all()
    for loc in locations:
        print(f"ID: {loc.id}, Name: {loc.name}, Type: {loc.type}")
