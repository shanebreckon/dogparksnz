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
        minZoom: 5,              // Restrict zoom out level to keep NZ in view
        zoomControl: false,      // Disable default zoom control to reposition it
        attributionControl: false // Disable default attribution to reposition it
    }).setView([-41.2865, 174.7762], 7); // Default to New Zealand view
    
    // Add zoom control to bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
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
    
    // Add attribution control to bottom left
    L.control.attribution({
        position: 'bottomleft'
    }).addTo(map);
    
    // Add scale control to bottom right
    L.control.scale({
        position: 'bottomright',
        imperial: false
    }).addTo(map);
    
    // Create a custom control for zoom level display
    const ZoomLevelControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'zoom-level-control');
            container.style.padding = '5px';
            container.style.margin = '0 10px 90px 0'; // Position it 90px above the bottom and 10px to the left
            container.style.color = 'red';
            container.style.fontWeight = 'bold';
            container.style.textShadow = '0px 0px 2px white'; // Add text shadow for readability against map
            
            this._container = container;
            this._update();
            
            map.on('zoomend', this._update, this);
            
            return container;
        },
        
        onRemove: function(map) {
            map.off('zoomend', this._update, this);
        },
        
        _update: function() {
            if (this._container) {
                this._container.innerHTML = 'Zoom: ' + map.getZoom();
            }
        }
    });
    
    // Add the custom zoom level control to the map
    new ZoomLevelControl().addTo(map);
    
    // Store non-point geometries in a separate layer group
    const nonPointLayers = L.featureGroup();
    map.addLayer(nonPointLayers);
    
    // Map to store references between center markers and actual geometries
    const markerToGeometryMap = new Map();
    
    // Search functionality
    const searchBox = document.getElementById('search-box');
    const searchResults = document.getElementById('searchResults');
    let searchTimeout = null;
    let currentMarker = null;
    
    // Function to handle search input
    searchBox.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Hide results if query is empty
        if (query.length < 2) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }
        
        // Set a timeout to prevent too many requests
        searchTimeout = setTimeout(() => {
            // Show loading indicator
            searchResults.innerHTML = '<div class="search-result-item">Searching...</div>';
            searchResults.classList.add('active');
            
            fetch(`/api/search?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    // Clear previous results
                    searchResults.innerHTML = '';
                    
                    // If no results found
                    if (data.length === 0) {
                        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
                        return;
                    }
                    
                    // Display results
                    data.forEach(location => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';
                        
                        // Format differently based on source
                        if (location.source === 'database') {
                            resultItem.innerHTML = `<strong>${location.name}</strong><br><small>${location.description || location.type}</small>`;
                        }
                        else if (location.source === 'photon') {
                            resultItem.innerHTML = `<strong>${location.name}</strong><br><small>${location.description}, New Zealand</small>`;
                        }
                        else if (location.source === 'osm') {
                            resultItem.innerHTML = `<strong>${location.name}</strong><br><small>${location.description || location.type}, New Zealand</small>`;
                        }
                        else if (location.source === 'city_list') {
                            resultItem.innerHTML = `<strong>${location.name}</strong><br><small>${location.description}</small>`;
                        }
                        
                        // Add click event to fly to location
                        resultItem.addEventListener('click', function() {
                            // Fly to the location
                            map.flyTo([location.lat, location.lng], 14);
                            
                            // Clear any existing search results
                            searchResults.classList.remove('active');
                            searchResults.innerHTML = '';
                            
                            // Format location details for display
                            let details = formatLocationDetails(location);
                            
                            // Set the search box value to the formatted details
                            searchBox.value = details;
                            
                            // Display location details in a toast or info box
                            displayLocationInfo(location);
                        });
                        
                        searchResults.appendChild(resultItem);
                    });
                    
                    // Show results container
                    searchResults.classList.add('active');
                })
                .catch(error => {
                    console.error('Error searching locations:', error);
                });
        }, 300);
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchBox.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
    
    // Show results when focusing on search box if it has content
    searchBox.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) {
            searchResults.classList.add('active');
        }
    });
    
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
    
    // Function to format location details
    function formatLocationDetails(location) {
        // Compile all available information
        let details = [];
        
        // Add name
        details.push(location.name);
        
        // Add type if available
        if (location.type) {
            details.push(location.type);
        }
        
        // Add description if available
        if (location.description) {
            if (typeof location.description === 'string') {
                details.push(location.description);
            } else if (Array.isArray(location.description)) {
                details.push(location.description.join(', '));
            }
        }
        
        // Always add New Zealand at the end
        details.push('New Zealand');
        
        // Return comma-separated string
        return details.join(', ');
    }
    
    // Function to display location information
    function displayLocationInfo(location) {
        // Create a toast-style notification
        const toast = document.createElement('div');
        toast.className = 'location-toast';
        
        // Use the same formatting function but with HTML for the name
        let details = formatLocationDetails(location).replace(location.name, `<strong>${location.name}</strong>`);
        
        // Set the content
        toast.innerHTML = details;
        
        // Add to the map container
        document.querySelector('.leaflet-container').appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 5000);
    }
    
    // Load all locations when the page loads
    loadLocations();
});
