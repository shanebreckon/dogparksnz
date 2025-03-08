from flask import render_template, request, jsonify
from app import app, db
import json
from models import MapLocation, LocationType, calculate_center_coordinates
from geoalchemy2.functions import ST_GeomFromGeoJSON
from geoalchemy2.shape import from_shape
from shapely.geometry import shape
from geoalchemy2 import WKTElement
from sqlalchemy.exc import SQLAlchemyError
import traceback  
from sqlalchemy import text
import shapely.wkt
from shapely.geometry import mapping
import requests
import time
import difflib

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

@app.route('/api/search', methods=['GET'])
def search_locations():
    """Search for locations based on query"""
    query = request.args.get('q', '')
    
    if not query or len(query) < 2:
        return jsonify({"results": [], "suggestions": []})
    
    locations = []
    suggestions = []
    
    try:
        # Get a list of all location names for suggestions if needed
        all_locations_sql = text("""
            SELECT name FROM map_location
        """)
        all_location_names = [row[0] for row in db.session.execute(all_locations_sql).fetchall()]
        
        # Search for dog parks in our database
        sql = text("""
            SELECT TOP 10
                ml.id, ml.name, ml.description, ml.type, 
                ml.lat, ml.lng,
                lt.short_name as type_name, lt.icon, lt.color
            FROM map_location ml
            LEFT JOIN location_type lt ON ml.type = lt.id
            WHERE LOWER(ml.name) LIKE LOWER(:query)
            ORDER BY ml.name
        """)
        
        results = db.session.execute(sql, {"query": f"%{query}%"}).fetchall()
        
        for row in results:
            # Create location_type object with icon and color
            location_type_info = None
            if row.type:
                location_type_info = {
                    'id': row.type,
                    'name': row.type_name,
                    'icon': row.icon,
                    'color': row.color
                }
                
            locations.append({
                'id': row.id,
                'name': row.name,
                'description': row.description,
                'type': row.type,
                'location_type': location_type_info,
                'lat': row.lat,
                'lng': row.lng,
                'source': 'database'
            })
        
        # If we have fewer than 10 results, search Photon API for locations in New Zealand
        if len(locations) < 10:
            # Use Photon API which is better for partial matches
            photon_params = {
                'q': query,
                'limit': 10 - len(locations),
                'lang': 'en',
                'osm_tag': 'place',  # Focus on places
                'bbox': '165.5,-47.5,179.0,-34.0'  # New Zealand bounding box
            }
            
            photon_response = requests.get('https://photon.komoot.io/api/', params=photon_params)
            
            if photon_response.status_code == 200:
                photon_data = photon_response.json()
                
                if 'features' in photon_data:
                    for feature in photon_data['features']:
                        if 'properties' in feature and 'geometry' in feature:
                            properties = feature['properties']
                            geometry = feature['geometry']
                            
                            # Skip if not in New Zealand
                            if properties.get('country') != 'New Zealand':
                                continue
                            
                            # Skip neighborhoods
                            if properties.get('osm_key') == 'place' and properties.get('osm_value') == 'neighbourhood':
                                continue
                            
                            # Get the name and type
                            name = properties.get('name')
                            if not name:
                                continue
                                
                            # Check if query is actually part of the name (case insensitive)
                            if query.lower() not in name.lower():
                                continue
                            
                            # Determine the place type
                            place_type = 'Location'
                            if properties.get('city'):
                                place_type = 'City'
                            elif properties.get('town'):
                                place_type = 'Town'
                            elif properties.get('suburb'):
                                place_type = 'Suburb'
                            elif properties.get('village'):
                                place_type = 'Village'
                            
                            # Build a description from available properties
                            description_parts = []
                            for part in ['city', 'state', 'suburb', 'district']:
                                if part in properties and properties[part] != name:
                                    description_parts.append(properties[part])
                            
                            description = ', '.join(description_parts) if description_parts else place_type
                            
                            # Get coordinates
                            if geometry['type'] == 'Point' and len(geometry['coordinates']) >= 2:
                                lng, lat = geometry['coordinates']
                                
                                # Create a default location_type for external locations
                                location_type_info = {
                                    'id': None,
                                    'name': place_type,
                                    'icon': 'place',  # Material Icons map marker
                                    'color': '#666666'  # Default gray color
                                }
                                
                                locations.append({
                                    'id': None,
                                    'name': name,
                                    'description': description,
                                    'type': place_type,
                                    'location_type': location_type_info,
                                    'lat': lat,
                                    'lng': lng,
                                    'source': 'photon'
                                })
        
        # Generate suggestions based on all location names
        suggestions = difflib.get_close_matches(query.lower(), [name.lower() for name in all_location_names], n=3, cutoff=0.5)
        
        # Convert suggestions back to proper case
        proper_case_suggestions = []
        for suggestion in suggestions:
            # Find the original proper case version
            for original_name in all_location_names:
                if original_name.lower() == suggestion:
                    proper_case_suggestions.append(original_name)
                    break
        
        # If we have no results but need suggestions, use Photon API with relaxed parameters
        if len(locations) == 0 and len(proper_case_suggestions) < 3:
            # Use Photon API with more relaxed parameters to find similar locations
            photon_suggestion_params = {
                'q': query,
                'limit': 5,
                'lang': 'en',
                'osm_tag': 'place',
                'bbox': '165.5,-47.5,179.0,-34.0'  # New Zealand bounding box
            }
            
            try:
                photon_suggestion_response = requests.get('https://photon.komoot.io/api/', params=photon_suggestion_params)
                
                if photon_suggestion_response.status_code == 200:
                    photon_suggestion_data = photon_suggestion_response.json()
                    
                    if 'features' in photon_suggestion_data:
                        for feature in photon_suggestion_data['features']:
                            if 'properties' in feature:
                                properties = feature['properties']
                                
                                # Skip if not in New Zealand
                                if properties.get('country') != 'New Zealand':
                                    continue
                                
                                # Get the name
                                name = properties.get('name')
                                if not name or name.lower() == query.lower():
                                    continue
                                
                                # Add to suggestions if not already there
                                if name not in proper_case_suggestions:
                                    proper_case_suggestions.append(name)
                                    
                                # Stop if we have enough suggestions
                                if len(proper_case_suggestions) >= 3:
                                    break
            except Exception as e:
                app.logger.error(f"Error getting suggestions from Photon API: {str(e)}")
        
        # If we have no results but have suggestions, prioritize showing suggestions
        if len(locations) == 0 and len(proper_case_suggestions) > 0:
            app.logger.info(f"No results for '{query}', but found suggestions: {proper_case_suggestions}")
        
        return jsonify({"results": locations, "suggestions": proper_case_suggestions})
    
    except Exception as e:
        app.logger.error(f"Error in search: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all map locations."""
    try:
        # Get query parameters
        type_filter = request.args.get('type')
        
        # Build SQL query
        sql_query = """
            SELECT 
                ml.id, ml.name, ml.description, ml.type, ml.lat, ml.lng, 
                ml.created_at, ml.updated_at,
                lt.id as lt_id, lt.short_name, lt.icon, lt.color
            FROM map_location ml
            JOIN location_type lt ON ml.type = lt.id
        """
        
        params = {}
        
        # Apply filters if provided
        if type_filter:
            try:
                # If it's a numeric ID
                type_id = int(type_filter)
                sql_query += " WHERE ml.type = :type_id"
                params['type_id'] = type_id
            except ValueError:
                # If it's a string short_name
                sql_query += " WHERE lt.short_name = :type_name"
                params['type_name'] = type_filter
        
        # Execute the query
        results = db.session.execute(text(sql_query), params).fetchall()
        
        # Process results
        locations_dict = []
        for row in results:
            # Get the location ID to fetch geometry
            location_id = row.id
            
            # Get geometry data using SQL Server's specific functions
            geo_sql = text("SELECT geometry.STAsText() as wkt FROM map_location WHERE id = :id")
            geo_result = db.session.execute(geo_sql, {"id": location_id}).fetchone()
            
            # Process geometry if available
            geometry_json = None
            if geo_result and geo_result.wkt:
                # Convert WKT to Shapely geometry
                geom = shapely.wkt.loads(geo_result.wkt)
                
                # Convert to GeoJSON
                geometry_json = mapping(geom)
            
            # Create location dictionary
            location = {
                'id': row.id,
                'name': row.name,
                'description': row.description,
                'type': row.type,
                'lat': row.lat,
                'lng': row.lng,
                'geometry': geometry_json,
                'location_type': {
                    'id': row.lt_id,
                    'short_name': row.short_name,
                    'icon': row.icon,
                    'color': row.color
                },
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None
            }
            
            locations_dict.append(location)
        
        return jsonify({"success": True, "data": locations_dict})
        
    except Exception as e:
        app.logger.error(f"Error fetching locations: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/locations', methods=['POST'])
def create_location():
    """Create a new map location."""
    try:
        # Get the JSON data from the request
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'geometry', 'location_type']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        # Get the location type
        location_type_input = data['location_type']
        
        # Check if location_type is a numeric ID or a string name
        location_type = None
        if isinstance(location_type_input, int) or location_type_input.isdigit():
            # If it's a numeric ID, get the location type by ID
            type_id = int(location_type_input)
            location_type = LocationType.query.get(type_id)
        else:
            # If it's a string, get the location type by short_name
            location_type = LocationType.query.filter_by(short_name=location_type_input).first()
        
        if not location_type:
            return jsonify({"success": False, "error": f"Invalid location type: {location_type_input}"}), 400
        
        # Extract geometry data
        geometry = data['geometry']
        
        # Calculate center point for the geometry
        lat, lng = calculate_center_coordinates(geometry)
        
        try:
            # Convert GeoJSON to WKT
            # Handle different GeoJSON types
            if isinstance(geometry, dict) and 'type' in geometry:
                if geometry['type'].lower() == 'featurecollection' and 'features' in geometry and len(geometry['features']) > 0:
                    # Use the first feature's geometry
                    feature = geometry['features'][0]
                    if 'geometry' in feature:
                        geom_shape = shape(feature['geometry'])
                    else:
                        # If no geometry in feature, try to use the feature itself
                        geom_shape = shape(feature)
                elif geometry['type'].lower() == 'feature' and 'geometry' in geometry:
                    geom_shape = shape(geometry['geometry'])
                else:
                    # Try to use the geometry directly
                    geom_shape = shape(geometry)
            else:
                # Not a recognized GeoJSON format
                geom_shape = shape(geometry)
                
            wkt = geom_shape.wkt
            
            # Create a SQL query to insert the geography data
            sql = text("""
                INSERT INTO map_location (name, description, geometry, type, lat, lng, created_at, updated_at)
                VALUES (:name, :description, geography::STGeomFromText(:wkt, 4326), :type, :lat, :lng, GETUTCDATE(), GETUTCDATE());
            """)
            
            # Execute the query with parameters
            db.session.execute(
                sql, 
                {
                    'name': data['name'],
                    'description': data.get('description', ''),
                    'wkt': wkt,
                    'type': location_type.id,
                    'lat': lat,
                    'lng': lng
                }
            )
            
            # Now get the ID of the newly created location
            id_sql = text("SELECT IDENT_CURRENT('map_location') AS id")
            result = db.session.execute(id_sql)
            location_id = int(result.scalar())
            
            # Commit the transaction
            db.session.commit()
            
            # Return the new location
            return jsonify({"success": True, "data": {"id": location_id}}), 201
            
        except Exception as e:
            # Rollback the transaction if an error occurs
            db.session.rollback()
            app.logger.error(f"Error creating location: {str(e)}")
            app.logger.error(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500
            
    except Exception as e:
        app.logger.error(f"Error creating location: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

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
    """Update an existing map location."""
    try:
        # Get the JSON data from the request
        data = request.get_json()
        
        # Check if the location exists
        location = MapLocation.query.get(location_id)
        if not location:
            return jsonify({"success": False, "error": f"Location with ID {location_id} not found"}), 404
        
        # Validate required fields
        required_fields = ['name', 'geometry', 'location_type']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        # Get the location type
        location_type_input = data['location_type']
        
        # Check if location_type is a numeric ID or a string name
        location_type = None
        if isinstance(location_type_input, int) or (isinstance(location_type_input, str) and location_type_input.isdigit()):
            # If it's a numeric ID, get the location type by ID
            type_id = int(location_type_input)
            location_type = LocationType.query.get(type_id)
        else:
            # If it's a string, get the location type by short_name
            location_type = LocationType.query.filter_by(short_name=location_type_input).first()
        
        if not location_type:
            return jsonify({"success": False, "error": f"Invalid location type: {location_type_input}"}), 400
        
        # Extract geometry data
        geometry = data['geometry']
        
        # Calculate center point for the geometry
        lat, lng = calculate_center_coordinates(geometry)
        
        try:
            # Convert GeoJSON to WKT
            # Handle different GeoJSON types
            if isinstance(geometry, dict) and 'type' in geometry:
                if geometry['type'].lower() == 'featurecollection' and 'features' in geometry and len(geometry['features']) > 0:
                    # Use the first feature's geometry
                    feature = geometry['features'][0]
                    if 'geometry' in feature:
                        geom_shape = shape(feature['geometry'])
                    else:
                        # If no geometry in feature, try to use the feature itself
                        geom_shape = shape(feature)
                elif geometry['type'].lower() == 'feature' and 'geometry' in geometry:
                    geom_shape = shape(geometry['geometry'])
                else:
                    # Try to use the geometry directly
                    geom_shape = shape(geometry)
            else:
                # Not a recognized GeoJSON format
                geom_shape = shape(geometry)
                
            wkt = geom_shape.wkt
            
            # Update the location with SQL
            sql = text("""
                UPDATE map_location
                SET 
                    name = :name,
                    description = :description,
                    geometry = geography::STGeomFromText(:wkt, 4326),
                    type = :type,
                    lat = :lat,
                    lng = :lng,
                    updated_at = GETUTCDATE()
                WHERE id = :id
            """)
            
            # Execute the query with parameters
            db.session.execute(
                sql, 
                {
                    'name': data['name'],
                    'description': data.get('description', ''),
                    'wkt': wkt,
                    'type': location_type.id,
                    'lat': lat,
                    'lng': lng,
                    'id': location_id
                }
            )
            
            # Commit the transaction
            db.session.commit()
            
            # Return the updated location
            updated_location = MapLocation.query.get(location_id)
            return jsonify({"success": True, "data": updated_location.to_dict()}), 200
            
        except Exception as e:
            # Rollback the transaction if an error occurs
            db.session.rollback()
            app.logger.error(f"Error updating location: {str(e)}")
            app.logger.error(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500
            
    except Exception as e:
        app.logger.error(f"Error updating location: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/locations/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    """Delete a specific map location."""
    try:
        check_sql = text("SELECT id FROM map_location WHERE id = :id")
        result = db.session.execute(check_sql, {"id": location_id}).fetchone()
        
        if not result:
            return jsonify({"success": False, "error": f"Location with ID {location_id} not found"}), 404
        
        delete_sql = text("DELETE FROM map_location WHERE id = :id")
        db.session.execute(delete_sql, {"id": location_id})
        db.session.commit()
        
        return jsonify({"success": True, "message": f"Location with ID {location_id} deleted successfully"}), 200
    except Exception as e:
        if 'db' in locals() and db.session:
            db.session.rollback()
        error_msg = f"Error deleting location: {str(e)}"
        return jsonify({"success": False, "error": error_msg}), 500

@app.route('/api/dog_parks', methods=['GET'])
def get_dog_parks():
    """Get all dog parks."""
    try:
        # Build SQL query to get dog parks (type = 1)
        sql_query = """
            SELECT 
                ml.id, ml.name, ml.description, ml.type, ml.lat, ml.lng, 
                ml.created_at, ml.updated_at,
                lt.id as lt_id, lt.short_name, lt.icon, lt.color
            FROM map_location ml
            JOIN location_type lt ON ml.type = lt.id
            WHERE ml.type = 1
        """
        
        # Execute the query
        results = db.session.execute(text(sql_query)).fetchall()
        
        # Process results
        locations_dict = []
        for row in results:
            # Get the location ID to fetch geometry
            location_id = row.id
            
            # Get geometry data using SQL Server's specific functions
            geo_sql = text("SELECT geometry.STAsText() as wkt FROM map_location WHERE id = :id")
            geo_result = db.session.execute(geo_sql, {"id": location_id}).fetchone()
            
            # Process geometry if available
            geometry_json = None
            if geo_result and geo_result.wkt:
                # Convert WKT to Shapely geometry
                geom = shapely.wkt.loads(geo_result.wkt)
                
                # Convert to GeoJSON
                geometry_json = mapping(geom)
            
            # Create location dictionary
            location = {
                'id': row.id,
                'name': row.name,
                'description': row.description,
                'type': row.type,
                'lat': row.lat,
                'lng': row.lng,
                'geometry': geometry_json,
                'location_type': {
                    'id': row.lt_id,
                    'short_name': row.short_name,
                    'icon': row.icon,
                    'color': row.color
                },
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None
            }
            
            locations_dict.append(location)
        
        return jsonify(locations_dict)
        
    except Exception as e:
        app.logger.error(f"Error fetching dog parks: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

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
            VALUES (:name, :description, geography::STGeomFromText(:wkt, 4326), :type, GETUTCDATE(), GETUTCDATE())
        """)
        
        db.session.execute(
            sql, 
            {
                'name': name, 
                'description': description, 
                'wkt': wkt,
                'type': type
            }
        )
        
        # Get the ID of the newly inserted record
        id_sql = text("SELECT IDENT_CURRENT('map_location') AS id")
        result = db.session.execute(id_sql)
        inserted_id = int(result.scalar())
        
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

# Location Type API Endpoints
@app.route('/api/location-types', methods=['GET'])
def get_location_types():
    """Get all location types."""
    try:
        location_types = LocationType.query.all()
        return jsonify({
            'success': True,
            'data': [lt.to_dict() for lt in location_types]
        })
    except Exception as e:
        app.logger.error(f"Error fetching location types: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/location-types/<int:type_id>', methods=['GET'])
def get_location_type(type_id):
    """Get a specific location type by ID."""
    try:
        location_type = LocationType.query.get(type_id)
        if not location_type:
            return jsonify({"success": False, "error": "Location type not found"}), 404
        
        return jsonify({
            'success': True,
            'data': location_type.to_dict()
        })
    except Exception as e:
        app.logger.error(f"Error fetching location type: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/location-types', methods=['POST'])
def create_location_type():
    """Create a new location type."""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['short_name', 'icon', 'color']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        # Check if short_name already exists
        existing = LocationType.query.filter_by(short_name=data['short_name']).first()
        if existing:
            return jsonify({"success": False, "error": f"Location type with short_name '{data['short_name']}' already exists"}), 400
        
        # Create new location type
        location_type = LocationType(
            short_name=data['short_name'],
            icon=data['icon'],
            color=data['color']
        )
        
        db.session.add(location_type)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': location_type.to_dict(),
            'message': 'Location type created successfully'
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating location type: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/location-types/<int:type_id>', methods=['PUT'])
def update_location_type(type_id):
    """Update a specific location type."""
    try:
        location_type = LocationType.query.get(type_id)
        if not location_type:
            return jsonify({"success": False, "error": "Location type not found"}), 404
        
        data = request.json
        
        # Update fields if provided
        if 'short_name' in data and data['short_name']:
            # Check if new short_name already exists for another record
            existing = LocationType.query.filter_by(short_name=data['short_name']).first()
            if existing and existing.id != type_id:
                return jsonify({"success": False, "error": f"Location type with short_name '{data['short_name']}' already exists"}), 400
            
            location_type.short_name = data['short_name']
        
        if 'icon' in data and data['icon']:
            location_type.icon = data['icon']
        
        if 'color' in data and data['color']:
            location_type.color = data['color']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': location_type.to_dict(),
            'message': 'Location type updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating location type: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/location-types/<int:type_id>', methods=['DELETE'])
def delete_location_type(type_id):
    """Delete a specific location type."""
    try:
        location_type = LocationType.query.get(type_id)
        if not location_type:
            return jsonify({"success": False, "error": "Location type not found"}), 404
        
        # Check if any locations are using this type
        locations_count = MapLocation.query.filter_by(location_type_id=type_id).count()
        if locations_count > 0:
            return jsonify({
                "success": False, 
                "error": f"Cannot delete location type that is used by {locations_count} locations. Update or delete those locations first."
            }), 400
        
        db.session.delete(location_type)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Location type deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting location type: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
