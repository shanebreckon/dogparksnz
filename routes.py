from flask import render_template, request, jsonify
from app import app, db
import json
from models import MapLocation, calculate_center_coordinates
from geoalchemy2.functions import ST_GeomFromGeoJSON
from geoalchemy2.shape import from_shape
from shapely.geometry import shape
from geoalchemy2 import WKTElement
from sqlalchemy.exc import SQLAlchemyError
import traceback  
from sqlalchemy import text
import shapely.wkt
from shapely.geometry import mapping

@app.route('/')
def index():
    """Render the public page with the map."""
    return render_template('public.html')

@app.route('/public')
def public():
    """Render the public page with the map."""
    return render_template('public.html')

@app.route('/admin')
def admin():
    """Render the admin page with the map drawing application."""
    return render_template('admin.html')

@app.route('/api/locations', methods=['GET'])
def get_all_locations():
    """Get all map locations."""
    try:
        sql = text("""
            SELECT 
                id, name, description, type, 
                geometry.STAsText() as wkt,
                lat, lng,
                created_at, updated_at
            FROM map_location
        """)
        
        results = db.session.execute(sql).fetchall()
        
        locations = []
        for row in results:
            try:
                geom = shapely.wkt.loads(row.wkt)
                geojson = mapping(geom)
                
                location_dict = {
                    'id': row.id,
                    'name': row.name,
                    'description': row.description,
                    'geometry': geojson,
                    'type': row.type,
                    'lat': row.lat,
                    'lng': row.lng,
                    'created_at': row.created_at.isoformat(),
                    'updated_at': row.updated_at.isoformat()
                }
                locations.append(location_dict)
            except Exception as e:
                locations.append({
                    'id': row.id,
                    'name': row.name,
                    'description': row.description,
                    'type': row.type,
                    'lat': row.lat,
                    'lng': row.lng,
                    'error': f"Error processing geometry: {str(e)}",
                    'created_at': row.created_at.isoformat(),
                    'updated_at': row.updated_at.isoformat()
                })
        
        return jsonify({"success": True, "data": locations}), 200
    except Exception as e:
        error_msg = f"Error fetching locations: {str(e)}"
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/locations', methods=['POST'])
def create_location():
    """Create a new map location."""
    try:
        data = request.json
        
        name = data.get('name')
        description = data.get('description', '')
        type = data.get('type')
        
        if not name or not type:
            return jsonify({"success": False, "error": "Name and type are required"}), 400
        
        geometry_data = data.get('geometry')
        if not geometry_data:
            return jsonify({"success": False, "error": "Geometry is required"}), 400
        
        try:
            if 'type' in geometry_data:
                if geometry_data['type'] == 'FeatureCollection' and 'features' in geometry_data:
                    if not geometry_data['features']:
                        return jsonify({"success": False, "error": "FeatureCollection has no features"}), 400
                    geometry_data = geometry_data['features'][0]['geometry']
                elif geometry_data['type'] == 'Feature' and 'geometry' in geometry_data:
                    geometry_data = geometry_data['geometry']
            
            shapely_geom = shape(geometry_data)
            wkt = shapely_geom.wkt
            
            # Calculate center coordinates
            lat, lng = calculate_center_coordinates(wkt)
            
            sql = text("""
                INSERT INTO map_location (name, description, geometry, type, lat, lng, created_at, updated_at)
                OUTPUT inserted.id
                VALUES (:name, :description, geography::STGeomFromText(:wkt, 4326), :type, :lat, :lng, GETDATE(), GETDATE())
            """)
            
            try:
                result = db.session.execute(
                    sql, 
                    {
                        'name': name, 
                        'description': description, 
                        'wkt': wkt,
                        'type': type,
                        'lat': lat,
                        'lng': lng
                    }
                )
                
                inserted_id = result.scalar()
                
                sql = text("""
                    SELECT 
                        id, name, description, type, 
                        geometry.STAsText() as wkt,
                        lat, lng,
                        created_at, updated_at
                    FROM map_location
                    WHERE id = :id
                """)
                
                result = db.session.execute(sql, {"id": inserted_id}).fetchone()
                
                if result:
                    geom = shapely.wkt.loads(result.wkt)
                    geojson = mapping(geom)
                    
                    result_dict = {
                        'id': result.id,
                        'name': result.name,
                        'description': result.description,
                        'geometry': geojson,
                        'type': result.type,
                        'lat': result.lat,
                        'lng': result.lng,
                        'created_at': result.created_at.isoformat(),
                        'updated_at': result.updated_at.isoformat()
                    }
                    
                    db.session.commit()
                    return jsonify({"success": True, "data": result_dict}), 201
                else:
                    db.session.rollback()
                    return jsonify({"success": False, "error": "Failed to retrieve the inserted record"}), 500
            except SQLAlchemyError as sql_error:
                db.session.rollback()
                error_msg = f"Database error: {str(sql_error)}"
                return jsonify({"success": False, "error": error_msg}), 500
                
        except Exception as e:
            error_msg = f"Invalid geometry format: {str(e)}"
            return jsonify({"success": False, "error": error_msg}), 400
            
    except Exception as e:
        if 'db' in locals() and db.session:
            db.session.rollback()
        error_msg = f"Error creating location: {str(e)}"
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/locations/<int:location_id>', methods=['GET'])
def get_location(location_id):
    """Get a specific map location by ID."""
    try:
        sql = text("""
            SELECT 
                id, name, description, type, 
                geometry.STAsText() as wkt,
                lat, lng,
                created_at, updated_at
            FROM map_location
            WHERE id = :id
        """)
        
        result = db.session.execute(sql, {"id": location_id}).fetchone()
        
        if not result:
            error_msg = f"Location with ID {location_id} not found"
            return jsonify({"success": False, "error": error_msg}), 404
        
        try:
            geom = shapely.wkt.loads(result.wkt)
            geojson = mapping(geom)
            
            location_dict = {
                'id': result.id,
                'name': result.name,
                'description': result.description,
                'geometry': geojson,
                'type': result.type,
                'lat': result.lat,
                'lng': result.lng,
                'created_at': result.created_at.isoformat(),
                'updated_at': result.updated_at.isoformat()
            }
            
            return jsonify({"success": True, "data": location_dict}), 200
        except Exception as e:
            error_msg = f"Error processing geometry for location {location_id}: {str(e)}"
            location_dict = {
                'id': result.id,
                'name': result.name,
                'description': result.description,
                'type': result.type,
                'lat': result.lat,
                'lng': result.lng,
                'error': error_msg,
                'created_at': result.created_at.isoformat(),
                'updated_at': result.updated_at.isoformat()
            }
            return jsonify({"success": True, "data": location_dict}), 200
    except Exception as e:
        error_msg = f"Error fetching location {location_id}: {str(e)}"
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/locations/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    """Update a specific map location."""
    try:
        data = request.json
        
        name = data.get('name')
        description = data.get('description', '')
        type = data.get('type')
        
        if not name or not type:
            return jsonify({"success": False, "error": "Name and type are required"}), 400
        
        # Check if the location exists
        check_sql = text("SELECT id FROM map_location WHERE id = :id")
        result = db.session.execute(check_sql, {"id": location_id}).fetchone()
        
        if not result:
            return jsonify({"success": False, "error": f"Location with ID {location_id} not found"}), 404
        
        # Handle geometry update if provided
        geometry_data = data.get('geometry')
        if geometry_data:
            try:
                if 'type' in geometry_data:
                    if geometry_data['type'] == 'FeatureCollection' and 'features' in geometry_data:
                        if not geometry_data['features']:
                            return jsonify({"success": False, "error": "FeatureCollection has no features"}), 400
                        geometry_data = geometry_data['features'][0]['geometry']
                    elif geometry_data['type'] == 'Feature' and 'geometry' in geometry_data:
                        geometry_data = geometry_data['geometry']
                
                shapely_geom = shape(geometry_data)
                wkt = shapely_geom.wkt
                
                # Calculate center coordinates
                lat, lng = calculate_center_coordinates(wkt)
                print(f"DEBUG: Calculated coordinates for location {location_id}: lat={lat}, lng={lng}")
                
                # First update just the geometry
                geo_sql = text("""
                    UPDATE map_location
                    SET geometry = geography::STGeomFromText(:wkt, 4326),
                        updated_at = GETDATE()
                    WHERE id = :id
                """)
                
                db.session.execute(geo_sql, {'id': location_id, 'wkt': wkt})
                db.session.flush()
                
                # Then update the other fields including coordinates in a separate statement
                update_sql = text("""
                    UPDATE map_location
                    SET name = :name, 
                        description = :description, 
                        type = :type,
                        lat = :lat,
                        lng = :lng
                    WHERE id = :id
                """)
                
                db.session.execute(
                    update_sql, 
                    {
                        'id': location_id,
                        'name': name, 
                        'description': description, 
                        'type': type,
                        'lat': lat,
                        'lng': lng
                    }
                )
                db.session.flush()
                print(f"DEBUG: Updated location {location_id} with new coordinates: lat={lat}, lng={lng}")
                
                # Verify the update immediately
                verify_sql = text("SELECT lat, lng FROM map_location WHERE id = :id")
                verify_result = db.session.execute(verify_sql, {"id": location_id}).fetchone()
                print(f"DEBUG: Verified coordinates after update: lat={verify_result.lat}, lng={verify_result.lng}")
                
            except Exception as e:
                db.session.rollback()
                error_msg = f"Invalid geometry format: {str(e)}"
                print(f"DEBUG ERROR: {error_msg}")
                return jsonify({"success": False, "error": error_msg}), 400
        else:
            # Update without changing geometry
            sql = text("""
                UPDATE map_location
                SET name = :name, 
                    description = :description, 
                    type = :type,
                    updated_at = GETDATE()
                WHERE id = :id
            """)
            
            db.session.execute(
                sql, 
                {
                    'id': location_id,
                    'name': name, 
                    'description': description, 
                    'type': type
                }
            )
        
        # Fetch the updated record
        sql = text("""
            SELECT 
                id, name, description, type, 
                geometry.STAsText() as wkt,
                lat, lng,
                created_at, updated_at
            FROM map_location
            WHERE id = :id
        """)
        
        result = db.session.execute(sql, {"id": location_id}).fetchone()
        
        if result:
            try:
                geom = shapely.wkt.loads(result.wkt)
                geojson = mapping(geom)
                
                # Double-check that lat/lng are updated correctly
                if geometry_data and (result.lat is None or result.lng is None or 
                                     (lat is not None and lng is not None and 
                                      (abs(result.lat - lat) > 0.0000001 or abs(result.lng - lng) > 0.0000001))):
                    print(f"DEBUG WARNING: Coordinates not properly updated for location {location_id}")
                    print(f"Expected: lat={lat}, lng={lng}, Got: lat={result.lat}, lng={result.lng}")
                    
                    # Force update with a separate statement
                    force_update_sql = text("""
                        UPDATE map_location
                        SET lat = :lat, lng = :lng
                        WHERE id = :id
                    """)
                    db.session.execute(force_update_sql, {"id": location_id, "lat": lat, "lng": lng})
                    db.session.flush()
                    print(f"DEBUG: Forced coordinate update to lat={lat}, lng={lng}")
                    
                    # Re-fetch to verify
                    verify_result = db.session.execute(verify_sql, {"id": location_id}).fetchone()
                    print(f"DEBUG: Re-verified coordinates: lat={verify_result.lat}, lng={verify_result.lng}")
                
                result_dict = {
                    'id': result.id,
                    'name': result.name,
                    'description': result.description,
                    'geometry': geojson,
                    'type': result.type,
                    'lat': result.lat,
                    'lng': result.lng,
                    'created_at': result.created_at.isoformat(),
                    'updated_at': result.updated_at.isoformat()
                }
                
                # Make sure to commit all changes
                db.session.commit()
                print(f"DEBUG: Successfully committed all changes for location {location_id}")
                return jsonify({"success": True, "data": result_dict}), 200
            except Exception as e:
                db.session.rollback()
                error_msg = f"Error processing updated geometry: {str(e)}"
                print(f"DEBUG ERROR: {error_msg}")
                return jsonify({"success": False, "error": error_msg}), 500
        else:
            db.session.rollback()
            return jsonify({"success": False, "error": "Failed to retrieve the updated record"}), 500
            
    except Exception as e:
        if 'db' in locals() and db.session:
            db.session.rollback()
        error_msg = f"Error updating location {location_id}: {str(e)}"
        print(f"DEBUG ERROR: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/locations/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    """Delete a specific map location."""
    try:
        check_sql = text("SELECT id FROM map_location WHERE id = :id")
        result = db.session.execute(check_sql, {"id": location_id}).fetchone()
        
        if not result:
            error_msg = f"Location with ID {location_id} not found"
            return jsonify({"success": False, "error": error_msg}), 404
        
        delete_sql = text("DELETE FROM map_location WHERE id = :id")
        db.session.execute(delete_sql, {"id": location_id})
        db.session.commit()
        
        return jsonify({"success": True, "message": f"Location with ID {location_id} deleted successfully"}), 200
    except Exception as e:
        if 'db' in locals() and db.session:
            db.session.rollback()
        error_msg = f"Error deleting location: {str(e)}"
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/test-geography', methods=['POST'])
def test_geography():
    """Test endpoint to diagnose Geography data type issues."""
    try:
        data = request.json
        
        from shapely.geometry import Point
        
        point = Point(174.7762, -41.2865)  # Wellington coordinates
        
        wkt = point.wkt
        
        name = "Test Point"
        description = "A test point for debugging"
        type = "test"
        
        sql = text("""
            INSERT INTO map_location (name, description, geometry, type, created_at, updated_at)
            OUTPUT inserted.id
            VALUES (:name, :description, geography::STGeomFromText(:wkt, 4326), :type, GETDATE(), GETDATE())
        """)
        
        result = db.session.execute(
            sql, 
            {
                'name': name, 
                'description': description, 
                'wkt': wkt,
                'type': type
            }
        )
        
        inserted_id = result.scalar()
        
        sql = text("""
            SELECT 
                id, name, description, type, 
                geometry.STAsText() as wkt,
                created_at, updated_at
            FROM map_location
            WHERE id = :id
        """)
        
        result = db.session.execute(sql, {"id": inserted_id}).fetchone()
        
        if result:
            geom = shapely.wkt.loads(result.wkt)
            geojson = mapping(geom)
            
            result_dict = {
                'id': result.id,
                'name': result.name,
                'description': result.description,
                'geometry': geojson,
                'type': result.type,
                'created_at': result.created_at.isoformat(),
                'updated_at': result.updated_at.isoformat()
            }
        else:
            result_dict = {"error": "Failed to retrieve the inserted record"}
        
        sql = text("DELETE FROM map_location WHERE id = :id")
        db.session.execute(sql, {"id": inserted_id})
        db.session.commit()
        
        return jsonify({"success": True, "message": "Geography test successful", "data": result_dict}), 200
    except Exception as e:
        if 'db' in locals() and db.session:
            db.session.rollback()
        error_msg = f"Error testing geography: {str(e)}"
        return jsonify({"success": False, "error": error_msg}), 500
