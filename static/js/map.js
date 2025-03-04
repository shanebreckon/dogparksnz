document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map
    const map = L.map('map').setView([-41.2865, 174.7762], 13); // Default to Wellington, NZ
    
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
                showArea: true
            },
            polyline: true,
            rectangle: true,
            circle: true,
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
        drawnItems.addLayer(layer);
    });
    
    // Event handler for when a shape is edited
    map.on(L.Draw.Event.EDITED, function(event) {
        const layers = event.layers;
        // We'll handle the save in the form submission
    });
    
    // Form submission handler
    document.getElementById('drawing-form').addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (drawnItems.getLayers().length === 0) {
            alert('Please draw something on the map first.');
            return;
        }
        
        const name = document.getElementById('drawing-name').value;
        const description = document.getElementById('drawing-description').value;
        
        // Convert drawn items to GeoJSON
        const geoJSON = drawnItems.toGeoJSON();
        
        // Prepare data for API
        const drawingData = {
            name: name,
            description: description,
            geometry: geoJSON,
            type: 'dog park'
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
                    }
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
                                    // Create a marker for points
                                    const marker = L.circleMarker(latlng, {
                                        radius: 8,
                                        fillColor: "#DB4437", // Google red
                                        color: "#FFFFFF",
                                        weight: 2,
                                        opacity: 1,
                                        fillOpacity: 1
                                    });
                                    
                                    // Add a popup with the name and description
                                    if (drawing.name) {
                                        let popupContent = `<strong>${drawing.name}</strong>`;
                                        if (drawing.description) {
                                            popupContent += `<br>${drawing.description}`;
                                        }
                                        marker.bindPopup(popupContent);
                                    }
                                    
                                    return marker;
                                }
                            });
                            
                            // Add markers to the cluster group and other geometries directly to the map
                            geoJSONLayer.eachLayer(layer => {
                                if (layer instanceof L.CircleMarker) {
                                    // Points go to the cluster
                                    markerCluster.addLayer(layer);
                                } else {
                                    // Other geometries (polygons, lines) go directly to the map
                                    layer.addTo(map);
                                    
                                    // Add a popup with the name and description for non-point features
                                    if (drawing.name) {
                                        let popupContent = `<strong>${drawing.name}</strong>`;
                                        if (drawing.description) {
                                            popupContent += `<br>${drawing.description}`;
                                        }
                                        layer.bindPopup(popupContent);
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Error adding drawing to map:', e);
                    }
                });
                
                // Add the cluster group to the map
                map.addLayer(markerCluster);
                
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
                return L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: "#DB4437", // Google red
                    color: "#FFFFFF",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1
                });
            }
        });
        
        geoJSONLayer.eachLayer(layer => {
            // Add a popup with the name and description
            if (drawing.name) {
                let popupContent = `<strong>${drawing.name}</strong>`;
                if (drawing.description) {
                    popupContent += `<br>${drawing.description}`;
                }
                layer.bindPopup(popupContent);
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
    
    // Function to edit a drawing
    function editDrawing(drawing) {
        // Set form values
        document.getElementById('drawing-name').value = drawing.name;
        document.getElementById('drawing-description').value = drawing.description;
        
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
