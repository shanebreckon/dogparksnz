from app import app, db
from sqlalchemy import text

def check_latest_location():
    """Check the latest updated location for lat/lng values."""
    with app.app_context():
        result = db.session.execute(
            text('SELECT TOP 1 id, name, geometry.STAsText() as wkt, lat, lng FROM map_location ORDER BY updated_at DESC')
        ).fetchone()
        
        if result:
            print(f'ID: {result.id}')
            print(f'Name: {result.name}')
            print(f'Lat: {result.lat}')
            print(f'Lng: {result.lng}')
            print(f'WKT: {result.wkt[:100]}...' if len(result.wkt) > 100 else f'WKT: {result.wkt}')
        else:
            print('No locations found')

if __name__ == '__main__':
    check_latest_location()
