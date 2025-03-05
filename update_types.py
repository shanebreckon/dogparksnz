from app import app, db
from sqlalchemy import text

with app.app_context():
    # Update all 'dog park' types to 'dog_park'
    db.session.execute(text("UPDATE map_location SET type = 'dog_park' WHERE type = 'dog park'"))
    db.session.commit()
    
    # Verify the update
    result = db.session.execute(text("SELECT id, name, type FROM map_location"))
    print("Updated location types:")
    for row in result:
        print(f"ID: {row.id}, Name: {row.name}, Type: {row.type}")
