document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map
    const map = L.map('map').setView([-41.2865, 174.7762], 7); // Default to New Zealand view
    
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
    
    // Store non-point geometries in a separate layer group
    const nonPointLayers = L.featureGroup();
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
    
    // Function to load all locations
    function loadLocations() {
        fetch('/api/locations')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error('Error loading locations:', data.error);
                    return;
                }
                
                const locations = data.data;
                
                // Create a marker cluster group
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
                
                locations.forEach(location => {
                    try {
                        // Only process dog_park locations
                        if (location.type === 'dog_park') {
                            // Add the GeoJSON to the map with custom styling
                            const geoJSONLayer = L.geoJSON(location.geometry, {
                                style: function(feature) {
                                    return {
                                        color: '#2E7D32', // Dark green to match paw icon
                                        weight: 3,
                                        opacity: 0.9,
                                        fillColor: '#2E7D32',
                                        fillOpacity: 0.2
                                    };
                                },
                                pointToLayer: function(feature, latlng) {
                                    // For point geometries, we'll handle them separately
                                    return null;
                                }
                            });
                            
                            // Add all geometries to the non-point layers group
                            geoJSONLayer.eachLayer(layer => {
                                // Store the location ID on the layer for reference
                                layer.locationId = location.id;
                                layer.locationType = location.type;
                                
                                // Apply the styling directly to each layer based on type
                                if (location.type === 'dog_park') {
                                    applyDogParkStyling(layer);
                                }
                                
                                nonPointLayers.addLayer(layer);
                            });
                            
                            // Create a marker at the center coordinates
                            if (location.lat !== null && location.lng !== null) {
                                const centerLatLng = L.latLng(location.lat, location.lng);
                                
                                // Create a visible marker for the center point
                                const centerMarker = L.marker(centerLatLng, {
                                    icon: L.divIcon({
                                        className: 'paw-marker',
                                        html: '<i class="material-icons">pets</i>',
                                        iconSize: [30, 30],
                                        iconAnchor: [15, 15]
                                    })
                                });
                                
                                // Add data to the marker for reference
                                centerMarker.locationId = location.id;
                                centerMarker.drawingType = location.geometry.type;
                                centerMarker.locationType = location.type;
                                
                                // Add click handler to zoom to appropriate level for geometry
                                centerMarker.on('click', function(e) {
                                    // Get the associated geometry
                                    const geometry = markerToGeometryMap.get(centerMarker);
                                    
                                    // Calculate appropriate zoom level based on geometry type and size
                                    const geometryType = location.geometry.type.toLowerCase();
                                    
                                    if (geometryType === 'point') {
                                        // For points, zoom to a closer level
                                        setTimeout(() => {
                                            map.setView(e.latlng, 18);
                                        }, 300);
                                    } else if (geometry) {
                                        // For polygons and polylines, fit to bounds with padding
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
                                console.warn(`Location ${location.id} (${location.name}) has no center coordinates.`);
                            }
                        }
                    } catch (e) {
                        console.error('Error adding location to map:', e);
                    }
                });
                
                // Add the marker cluster to the map
                map.addLayer(markerCluster);
                
                // Set up event listeners for marker cluster
                markerCluster.on('clusterclick', function(a) {
                    // When a cluster is clicked, hide all non-point geometries
                    nonPointLayers.eachLayer(function(layer) {
                        layer.setStyle({ opacity: 0, fillOpacity: 0 });
                    });
                });
                
                markerCluster.on('animationend', function() {
                    // When cluster animation ends, show geometries for visible markers
                    nonPointLayers.eachLayer(function(layer) {
                        // Default to hidden
                        layer.setStyle({ opacity: 0, fillOpacity: 0 });
                    });
                    
                    // For each visible marker, show its geometry
                    map.eachLayer(function(layer) {
                        if (layer instanceof L.Marker && layer.locationId) {
                            const geometry = markerToGeometryMap.get(layer);
                            if (geometry) {
                                geometry.setStyle({ 
                                    opacity: 0.9, 
                                    fillOpacity: 0.2 
                                });
                            }
                        }
                    });
                });
                
                // Handle zoom events
                map.on('zoomend', function() {
                    // When zoomed out, hide all geometries
                    if (map.getZoom() < 12) {
                        nonPointLayers.eachLayer(function(layer) {
                            layer.setStyle({ opacity: 0, fillOpacity: 0 });
                        });
                    } else {
                        // When zoomed in, show geometries for visible markers
                        nonPointLayers.eachLayer(function(layer) {
                            // Default to hidden
                            layer.setStyle({ opacity: 0, fillOpacity: 0 });
                        });
                        
                        // For each visible marker, show its geometry
                        map.eachLayer(function(layer) {
                            if (layer instanceof L.Marker && layer.locationId) {
                                const geometry = markerToGeometryMap.get(layer);
                                if (geometry) {
                                    geometry.setStyle({ 
                                        opacity: 0.9, 
                                        fillOpacity: 0.2 
                                    });
                                }
                            }
                        });
                    }
                });
                
                // If there are parks, zoom to fit them all
                if (markerCluster.getLayers().length > 0) {
                    map.fitBounds(markerCluster.getBounds(), {
                        padding: [50, 50]
                    });
                }
            })
            .catch(error => {
                console.error('Error loading locations:', error);
            });
    }
    
    // Load all locations when the page loads
    loadLocations();
});
