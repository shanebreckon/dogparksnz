document.addEventListener('DOMContentLoaded', function() {
    // Define New Zealand bounds (latitude and longitude boundaries)
    const nzBounds = L.latLngBounds(
        L.latLng(-47.5, 165.5),  // Southwest corner
        L.latLng(-34.0, 179.0)   // Northeast corner
    );
    
    // Initialize the map with bounds restriction
    const map = L.map('map', {
        maxBounds: nzBounds,     // Restrict panning to these bounds
        maxBoundsViscosity: 1.0, // Make the bounds completely solid (1.0 = cannot escape bounds)
        minZoom: 5               // Restrict zoom out level to keep NZ in view
    }).setView([-41.2865, 174.7762], 13); // Default to Wellington, NZ
    
    // Define base map layers
    // Add CartoDB Voyager (Google Maps-like style)
    const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    });
    
    // Add Esri Satellite (similar to Google Maps satellite)
    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });
    
    // Add the default map layer (CartoDB Voyager - Google Maps-like)
    cartoVoyager.addTo(map);
    
    // Create a layer control with just Map and Satellite options
    const baseMaps = {
        "Map": cartoVoyager,
        "Satellite": esriSatellite
    };
    
    L.control.layers(baseMaps).addTo(map);
    
    // Add scale control
    L.control.scale({imperial: false}).addTo(map);
    
    // Initialize FeatureGroup to store editable layers
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    // Store non-point geometries in a separate layer group
    const nonPointLayers = new L.FeatureGroup();
    map.addLayer(nonPointLayers);
    
    // Map to store references between center markers and actual geometries
    const markerToGeometryMap = new Map();
    
    // Function to apply dog_park styling to a layer
    function applyDogParkStyling(layer) {
        if (layer.setStyle) {
            layer.setStyle({
                color: '#2E7D32',
                fillColor: '#2E7D32',
                fillOpacity: 0.2,
                weight: 3,
                opacity: 0.9
            });
        }
    }
    
    // Function to apply vet styling to a layer
    function applyVetStyling(layer) {
        if (layer.setStyle) {
            layer.setStyle({
                color: '#1565C0',
                fillColor: '#1565C0',
                fillOpacity: 0.2,
                weight: 3,
                opacity: 0.9
            });
        }
    }
    
    // Function to apply styling based on location type
    function applyLocationStyling(layer, locationType) {
        if (locationType === 'vet') {
            applyVetStyling(layer);
        } else {
            // Default to dog_park styling
            applyDogParkStyling(layer);
        }
    }
    
    // Initialize draw control
    const drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            poly: {
                allowIntersection: false
            }
        },
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: true,
                shapeOptions: {
                    color: '#2E7D32',
                    fillColor: '#2E7D32',
                    fillOpacity: 0.2,
                    weight: 3
                }
            },
            polyline: {
                shapeOptions: {
                    color: '#2E7D32',
                    weight: 3
                }
            },
            rectangle: {
                shapeOptions: {
                    color: '#2E7D32',
                    fillColor: '#2E7D32',
                    fillOpacity: 0.2,
                    weight: 3
                }
            },
            circle: {
                shapeOptions: {
                    color: '#2E7D32',
                    fillColor: '#2E7D32',
                    fillOpacity: 0.2,
                    weight: 3
                }
            },
            marker: true,
            circlemarker: false
        }
    });
    map.addControl(drawControl);
    
    // Current drawing being edited
    let currentDrawingId = null;
    
    // Event handler for when a shape is created
    map.on(L.Draw.Event.CREATED, function(event) {
        const layer = event.layer;
        
        // Apply dog_park styling to the newly created layer
        applyDogParkStyling(layer);
        
        drawnItems.addLayer(layer);
    });
    
    // Event handler for when a shape is edited
    map.on(L.Draw.Event.EDITED, function(event) {
        const layers = event.layers;
        
        // Apply dog_park styling to all edited layers
        layers.eachLayer(function(layer) {
            applyDogParkStyling(layer);
        });
        
        // We'll handle the save in the form submission
    });
    
    // Form submission handler
    document.getElementById('drawing-form').addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (drawnItems.getLayers().length === 0) {
            alert('Please draw something on the map first.');
            return;
        }
        
        // Get form values
        const name = document.getElementById('drawing-name').value;
        const description = document.getElementById('drawing-description').value;
        const locationType = document.getElementById('location-type').value;
        
        // Validate form
        if (!name) {
            alert('Please enter a name for your drawing.');
            return;
        }
        
        // Validate that something has been drawn
        if (drawnItems.getLayers().length === 0) {
            alert('Please draw a shape on the map first.');
            return;
        }
        
        // Convert drawn items to GeoJSON
        const geoJSON = drawnItems.toGeoJSON();
        
        // Prepare data for API
        const drawingData = {
            name: name,
            description: description,
            geometry: geoJSON,
            location_type: locationType
        };
        
        // Determine if we're creating or updating
        const url = currentDrawingId 
            ? `/api/locations/${currentDrawingId}` 
            : '/api/locations';
        const method = currentDrawingId ? 'PUT' : 'POST';
        
        // Send to API
        console.log('Sending data to API:', JSON.stringify(drawingData, null, 2));
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(drawingData)
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                // Try to get the error message from the response
                return response.text().then(text => {
                    console.error('Error response:', text);
                    try {
                        // Try to parse as JSON
                        const errorData = JSON.parse(text);
                        throw new Error(`Server error (${response.status}): ${errorData.error || errorData.message || 'Unknown error'}`);
                    } catch (parseError) {
                        // If not JSON, use the raw text
                        throw new Error(`Server error (${response.status}): ${text || 'Unknown error'}`);
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Success response:', data);
            alert('Drawing saved successfully!');
            clearForm();
            loadDrawings();
        })
        .catch(error => {
            console.error('Error saving drawing:', error);
            const errorDetails = error.message || 'Unknown error';
            alert(`Error saving drawing. Details: ${errorDetails}`);
        });
    });
    
    // Clear button handler
    document.getElementById('clear-drawing').addEventListener('click', function() {
        clearForm();
    });
    
    // Function to clear the form and drawn items
    function clearForm() {
        document.getElementById('drawing-name').value = '';
        document.getElementById('drawing-description').value = '';
        drawnItems.clearLayers();
        currentDrawingId = null;
    }
    
    // Function to load saved drawings
    function loadDrawings() {
        fetch('/api/locations')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error('Error loading locations:', data.error);
                    return;
                }
                
                const drawings = data.data;
                const drawingsList = document.getElementById('drawings');
                drawingsList.innerHTML = '';
                
                // Create a marker cluster group instead of a feature group
                const markerCluster = L.markerClusterGroup({
                    showCoverageOnHover: false,
                    maxClusterRadius: 50,
                    iconCreateFunction: function(cluster) {
                        const count = cluster.getChildCount();
                        let size = 'small';
                        
                        if (count > 10) {
                            size = 'medium';
                        }
                        if (count > 20) {
                            size = 'large';
                        }
                        
                        return L.divIcon({
                            html: `<div><span>${count}</span></div>`,
                            className: `marker-cluster marker-cluster-${size}`,
                            iconSize: L.point(40, 40)
                        });
                    },
                    removeOutsideVisibleBounds: true,
                    animate: true,
                    animateAddingMarkers: true
                });
                
                drawings.forEach(drawing => {
                    // Add to the list
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = drawing.name;
                    
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'drawing-actions';
                    
                    const viewBtn = document.createElement('button');
                    viewBtn.className = 'btn btn-sm btn-primary';
                    viewBtn.textContent = 'View';
                    viewBtn.addEventListener('click', function() {
                        viewDrawing(drawing);
                    });
                    
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn btn-sm btn-secondary';
                    editBtn.textContent = 'Edit';
                    editBtn.addEventListener('click', function() {
                        editDrawing(drawing);
                    });
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-sm btn-danger';
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.addEventListener('click', function() {
                        deleteDrawing(drawing.id);
                    });
                    
                    actionsDiv.appendChild(viewBtn);
                    actionsDiv.appendChild(editBtn);
                    actionsDiv.appendChild(deleteBtn);
                    
                    listItem.appendChild(nameSpan);
                    listItem.appendChild(actionsDiv);
                    
                    drawingsList.appendChild(listItem);
                    
                    // Add to the map with custom styling
                    try {
                        if (drawing.geometry) {
                            // Create a GeoJSON layer for the actual geometry
                            const geoJSONLayer = L.geoJSON(drawing.geometry, {
                                style: function(feature) {
                                    // Check if this is a dog_park type and apply consistent dark green styling
                                    if (drawing.location_type === 'dog_park') {
                                        return {
                                            color: '#2E7D32', // Dark green to match paw icon
                                            weight: 3,
                                            opacity: 0.9,
                                            fillColor: '#2E7D32',
                                            fillOpacity: 0.2
                                        };
                                    } else if (drawing.location_type === 'vet') {
                                        return {
                                            color: '#1565C0', // Blue for vet locations
                                            weight: 3,
                                            opacity: 0.9,
                                            fillColor: '#1565C0',
                                            fillOpacity: 0.2
                                        };
                                    } else {
                                        return {
                                            color: '#4285F4', // Google blue for other types
                                            weight: 3,
                                            opacity: 0.9,
                                            fillColor: '#4285F4',
                                            fillOpacity: 0.2
                                        };
                                    }
                                },
                                pointToLayer: function(feature, latlng) {
                                    // For point geometries, we'll handle them separately
                                    return null;
                                }
                            });
                            
                            // Add all geometries to the non-point layers group
                            geoJSONLayer.eachLayer(layer => {
                                // Store the drawing ID on the layer for reference
                                layer.drawingId = drawing.id;
                                layer.locationType = drawing.location_type;
                                
                                // Apply the styling directly to each layer based on type
                                applyLocationStyling(layer, drawing.location_type);
                                
                                nonPointLayers.addLayer(layer);
                            });
                            
                            // Create a marker at the center coordinates
                            if (drawing.lat !== null && drawing.lng !== null) {
                                const centerLatLng = L.latLng(drawing.lat, drawing.lng);
                                
                                // Create a visible marker for the center point
                                const centerMarker = L.marker(centerLatLng, {
                                    icon: L.divIcon({
                                        className: drawing.location_type === 'vet' ? 'vet-marker' : 'paw-marker',
                                        html: drawing.location_type === 'vet' ? 
                                              '<i class="material-icons">local_hospital</i>' : 
                                              '<i class="material-icons">pets</i>',
                                        iconSize: [30, 30],
                                        iconAnchor: [15, 15]
                                    })
                                });
                                
                                // Add data to the marker for reference
                                centerMarker.drawingId = drawing.id;
                                centerMarker.drawingType = drawing.geometry.type;
                                centerMarker.locationType = drawing.location_type; // Store location type
                                
                                // Add click handler to zoom to appropriate level for geometry
                                centerMarker.on('click', function(e) {
                                    // Get the associated geometry
                                    const geometry = markerToGeometryMap.get(centerMarker);
                                    
                                    // Calculate appropriate zoom level based on geometry type and size
                                    const geometryType = drawing.geometry.type.toLowerCase();
                                    
                                    if (geometryType === 'point') {
                                        // For points, zoom to a closer level
                                        setTimeout(() => {
                                            map.setView(e.latlng, 18);
                                        }, 300);
                                    } else if (geometry) {
                                        // For polygons and polylines, fit to bounds with padding
                                        // Delay the fitBounds to ensure popup opens first
                                        setTimeout(() => {
                                            // Get bounds of the geometry
                                            const bounds = geometry.getBounds();
                                            map.fitBounds(bounds, {
                                                padding: [50, 50],
                                                maxZoom: 19
                                            });
                                        }, 300);
                                    } else {
                                        // Fallback for any other case - just zoom in on the marker
                                        setTimeout(() => {
                                            map.setView(e.latlng, 18);
                                        }, 300);
                                    }
                                });
                                
                                // Add to cluster
                                markerCluster.addLayer(centerMarker);
                                
                                // Store reference between center marker and actual geometry
                                geoJSONLayer.eachLayer(layer => {
                                    markerToGeometryMap.set(centerMarker, layer);
                                });
                            } else {
                                console.warn(`Location ${drawing.id} (${drawing.name}) has no center coordinates.`);
                            }
                        }
                    } catch (e) {
                        console.error('Error adding drawing to map:', e);
                    }
                });
                
                // Add the cluster group to the map
                map.addLayer(markerCluster);
                
                // Add a global variable to store all drawings
                window.allDrawings = drawings;
                
                // Force apply styling to all dog park geometries
                nonPointLayers.eachLayer(function(layer) {
                    // Check if the layer has location type directly
                    if (layer.locationType === 'dog_park') {
                        applyDogParkStyling(layer);
                    } else if (layer.drawingId) {
                        // Find the associated drawing
                        const drawing = drawings.find(d => d.id === layer.drawingId);
                        
                        if (drawing && drawing.location_type === 'dog_park') {
                            applyDogParkStyling(layer);
                        } else if (drawing && drawing.location_type === 'vet') {
                            applyVetStyling(layer);
                        }
                    }
                });
                
                // Function to update visibility of non-point geometries
                function updateGeometryVisibility() {
                    // Get all clustered markers
                    const clusteredMarkers = new Set();
                    markerCluster.eachLayer(function(marker) {
                        const parent = markerCluster.getVisibleParent(marker);
                        if (parent && parent !== marker) {
                            clusteredMarkers.add(marker);
                        }
                    });
                    
                    // Update visibility of all non-point geometries
                    markerToGeometryMap.forEach((geometry, marker) => {
                        // Check if the marker is for a dog_park
                        const isDogPark = marker.drawingId && window.allDrawings.find(d => d.id === marker.drawingId)?.location_type === 'dog_park';
                        const isVet = marker.drawingId && window.allDrawings.find(d => d.id === marker.drawingId)?.location_type === 'vet';
                        
                        if (clusteredMarkers.has(marker)) {
                            // If marker is in a cluster, hide the actual geometry
                            geometry.setStyle({ opacity: 0, fillOpacity: 0 });
                        } else {
                            // If marker is not in a cluster, show the actual geometry with appropriate styling
                            if (isDogPark) {
                                // Apply dark green styling for dog parks
                                applyDogParkStyling(geometry);
                            } else if (isVet) {
                                applyVetStyling(geometry);
                            } else {
                                // Default styling for other types
                                geometry.setStyle({ 
                                    color: '#4285F4', 
                                    opacity: 0.9, 
                                    fillOpacity: 0.2,
                                    fillColor: '#4285F4',
                                    weight: 3
                                });
                            }
                        }
                    });
                }
                
                // Update visibility on zoom and when clusters change
                map.on('zoomend', updateGeometryVisibility);
                markerCluster.on('animationend', updateGeometryVisibility);
                markerCluster.on('spiderfied', updateGeometryVisibility);
                markerCluster.on('unspiderfied', updateGeometryVisibility);
                
                // Initial update
                updateGeometryVisibility();
                
                // Hide non-point geometries when they are part of a cluster
                markerCluster.on('clusterclick', function(cluster) {
                    // Let the default behavior handle the zoom
                    // updateGeometryVisibility will be called after zoom animation
                });
                
                // Show non-point geometries when the cluster is expanded
                markerCluster.on('clusterexpand', function(cluster) {
                    // Let the updateGeometryVisibility function handle this
                });
                
                // If there are parks, zoom to fit them all
                if (markerCluster.getLayers().length > 0) {
                    map.fitBounds(markerCluster.getBounds());
                }
            })
            .catch(error => {
                console.error('Error loading drawings:', error);
            });
    }
    
    // Function to view a drawing
    function viewDrawing(drawing) {
        // Clear existing layers
        drawnItems.clearLayers();
        
        // Temporarily hide all non-point layers and marker cluster
        nonPointLayers.eachLayer(function(layer) {
            layer.setStyle({ opacity: 0, fillOpacity: 0 });
        });
        markerCluster.clearLayers();
        
        // Show back button
        const backButton = document.createElement('button');
        backButton.id = 'back-to-map-btn';
        backButton.className = 'btn btn-primary back-to-map';
        backButton.innerHTML = '&larr; Back to Map';
        backButton.addEventListener('click', backToFullMap);
        
        // Add the button to the map
        const backButtonControl = L.control({ position: 'topleft' });
        backButtonControl.onAdd = function() {
            const div = L.DomUtil.create('div', 'back-button-container');
            div.appendChild(backButton);
            return div;
        };
        backButtonControl.addTo(map);
        
        // Store the control for later removal
        map.backButtonControl = backButtonControl;
        
        // Add the GeoJSON to the map with custom styling
        const geoJSONLayer = L.geoJSON(drawing.geometry, {
            style: function(feature) {
                return {
                    color: '#4285F4', // Google blue
                    weight: 3,
                    opacity: 0.9,
                    fillColor: '#4285F4',
                    fillOpacity: 0.2
                };
            },
            pointToLayer: function(feature, latlng) {
                const marker = L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: "#DB4437", // Google red
                    color: "#FFFFFF",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1
                });
                
                // Store the drawing type for reference
                marker.drawingType = 'Point';
                
                return marker;
            }
        });
        
        geoJSONLayer.eachLayer(layer => {
            // Store drawing type for non-point features
            if (!(layer instanceof L.CircleMarker) && drawing.geometry.type) {
                layer.drawingType = drawing.geometry.type;
            }
            
            drawnItems.addLayer(layer);
        });
        
        // Zoom to the drawing
        map.fitBounds(drawnItems.getBounds(), {
            padding: [50, 50] // Add some padding around the bounds
        });
        
        // Open the popup if it's a point feature
        if (drawing.geometry.type === 'Point') {
            const layers = drawnItems.getLayers();
            if (layers.length > 0) {
                layers[0].openPopup();
            }
        }
    }
    
    // Function to go back to the full map view
    function backToFullMap() {
        // Clear the individual view
        drawnItems.clearLayers();
        
        // Remove the back button
        if (map.backButtonControl) {
            map.removeControl(map.backButtonControl);
            delete map.backButtonControl;
        }
        
        // Reload all drawings
        loadDrawings();
    }
    
    // Function to edit a drawing
    function editDrawing(drawing) {
        // Set form values
        document.getElementById('drawing-name').value = drawing.name;
        document.getElementById('drawing-description').value = drawing.description;
        document.getElementById('location-type').value = drawing.location_type || 'dog_park';
        
        // Set current drawing ID
        currentDrawingId = drawing.id;
        
        // Clear existing layers
        drawnItems.clearLayers();
        
        // Add the GeoJSON to the map for editing
        const geoJSONLayer = L.geoJSON(drawing.geometry);
        geoJSONLayer.eachLayer(layer => {
            drawnItems.addLayer(layer);
        });
        
        // Zoom to the drawing
        map.fitBounds(drawnItems.getBounds());
    }
    
    // Function to delete a drawing
    function deleteDrawing(id) {
        if (confirm('Are you sure you want to delete this drawing?')) {
            fetch(`/api/locations/${id}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    // Try to get the error message from the response
                    return response.text().then(text => {
                        console.error('Error response:', text);
                        try {
                            // Try to parse as JSON
                            const errorData = JSON.parse(text);
                            throw new Error(`Server error (${response.status}): ${errorData.error || errorData.message || 'Unknown error'}`);
                        } catch (parseError) {
                            // If not JSON, use the raw text
                            throw new Error(`Server error (${response.status}): ${text || 'Unknown error'}`);
                        }
                    });
                }
                alert('Drawing deleted successfully!');
                loadDrawings();
                
                // If we were editing this drawing, clear the form
                if (currentDrawingId === id) {
                    clearForm();
                }
            })
            .catch(error => {
                console.error('Error deleting drawing:', error);
                const errorDetails = error.message || 'Unknown error';
                alert(`Error deleting drawing. Details: ${errorDetails}`);
            });
        }
    }
    
    // Load drawings when page loads
    loadDrawings();
});
