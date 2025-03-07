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
    
    // Make map globally available
    window.dogParksMap = map;
    
    // Create a global object to store markers by location ID
    window.dogParkMarkers = {};
    
    // Create a global object to track which cluster contains each marker
    window.markerClusters = {};
    
    // Track active animation timeouts to cancel them if needed
    window.activeAnimations = {};
    
    // Create a tooltip element for markers
    const markerTooltip = document.createElement('div');
    markerTooltip.className = 'marker-tooltip';
    document.body.appendChild(markerTooltip);
    
    // Function to show tooltip for a marker
    function showMarkerTooltip(marker, locationName) {
        if (!marker || !marker._icon) return;
        
        // Set tooltip content
        markerTooltip.textContent = locationName;
        
        // Get marker position
        const markerRect = marker._icon.getBoundingClientRect();
        const markerCenterX = markerRect.left + (markerRect.width / 2);
        const markerCenterY = markerRect.top + (markerRect.height / 2);
        
        // Get map container dimensions
        const mapContainer = document.getElementById('map');
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Determine if marker is in top or bottom half of the map
        const isTopHalf = markerCenterY < (mapRect.top + mapRect.height / 2);
        
        // Check if there's enough room on both sides within the map
        const tooltipWidth = 300; // Same as CSS width
        const leftSpace = markerCenterX - mapRect.left;
        const rightSpace = mapRect.right - markerCenterX;
        const halfTooltipWidth = tooltipWidth / 2;
        
        // Position tooltip based on marker location and available space
        if (isTopHalf) {
            // Place tooltip below marker
            markerTooltip.style.top = `${markerRect.bottom + 15}px`;
            markerTooltip.classList.remove('top');
            markerTooltip.classList.add('bottom');
        } else {
            // Place tooltip above marker
            markerTooltip.style.top = `${markerRect.top - 15}px`;
            markerTooltip.classList.remove('bottom');
            markerTooltip.classList.add('top');
        }
        
        // Check horizontal space and adjust accordingly
        if (leftSpace < halfTooltipWidth) {
            // Not enough space on the left, align left edge with left edge of map with padding
            markerTooltip.style.left = `${mapRect.left + 10}px`;
            markerTooltip.style.transform = isTopHalf ? 'translate(0, 0)' : 'translate(0, -100%)';
        } else if (rightSpace < halfTooltipWidth) {
            // Not enough space on the right, align right edge with right edge of map with padding
            markerTooltip.style.left = `${mapRect.right - 10}px`;
            markerTooltip.style.transform = isTopHalf ? 'translate(-100%, 0)' : 'translate(-100%, -100%)';
        } else {
            // Enough space on both sides, center on marker
            markerTooltip.style.left = `${markerCenterX}px`;
            markerTooltip.style.transform = isTopHalf ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
        }
        
        // Show tooltip
        markerTooltip.classList.add('visible');
    }
    
    // Function to hide tooltip
    function hideMarkerTooltip() {
        markerTooltip.classList.remove('visible');
    }
    
    // Function to update the marker-to-cluster mapping
    window.updateClusterMapping = function() {
        // Clear previous cluster mappings
        window.markerClusters = {};
        
        // Find all marker clusters in the map
        map.eachLayer(function(layer) {
            // Check if this is a marker cluster group
            if (layer._featureGroup && layer._maxZoom) {
                // This is likely a marker cluster group
                layer._featureGroup.getLayers().forEach(function(subLayer) {
                    if (subLayer instanceof L.MarkerCluster) {
                        // This is a cluster
                        const childMarkers = subLayer.getAllChildMarkers();
                        
                        // Map each child marker ID to this cluster
                        childMarkers.forEach(function(marker) {
                            if (marker.locationId) {
                                window.markerClusters[marker.locationId] = subLayer;
                            }
                        });
                    }
                });
            }
        });
        
        console.log("Updated cluster mapping, found clusters for", Object.keys(window.markerClusters).length, "markers");
    };
    
    // Function to stop any active animations for a marker
    window.stopMarkerAnimation = function(markerId) {
        // Clear all timeouts for this marker
        if (window.activeAnimations[markerId]) {
            window.activeAnimations[markerId].forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
            
            // Reset the marker or cluster appearance
            const marker = window.dogParkMarkers[markerId];
            if (marker && marker._icon) {
                marker._icon.style.transition = '';
                marker._icon.style.transform = marker._originalTransform || '';
                marker._icon.style.zIndex = '';
            }
            
            // Check if the marker is in a cluster and reset that too
            if (window.markerClusters[markerId]) {
                const cluster = window.markerClusters[markerId];
                if (cluster && cluster._icon) {
                    cluster._icon.style.transition = '';
                    cluster._icon.style.transform = cluster._originalTransform || '';
                    cluster._icon.style.zIndex = '';
                }
            }
            
            // Clear the animation tracking
            delete window.activeAnimations[markerId];
        }
    };
    
    // Function to pulse a marker (grow and shrink 3 times)
    window.pulseMarker = function(markerId) {
        // First stop any existing animation
        window.stopMarkerAnimation(markerId);
        
        const marker = window.dogParkMarkers[markerId];
        if (!marker) return;
        
        // Initialize animation tracking array
        window.activeAnimations[markerId] = [];
        
        // Check if the marker is part of a cluster
        if (window.markerClusters[markerId]) {
            // Animate the cluster instead
            pulseCluster(markerId, window.markerClusters[markerId]);
            return;
        }
        
        // Get the marker element
        const markerElement = marker._icon;
        if (!markerElement) return;
        
        // Add CSS transition for smooth animation
        markerElement.style.transition = 'transform 0.3s ease-in-out';
        
        // Save original transform and add CSS transform-origin to keep centered
        const originalTransform = markerElement.style.transform || '';
        marker._originalTransform = originalTransform;
        markerElement.style.transformOrigin = 'center center';
        markerElement.style.zIndex = 1000; // Bring to front
        
        // Define the animation
        let pulseCount = 0;
        const maxPulses = 3;
        
        function pulse() {
            // Grow by 20%
            markerElement.style.transform = `${originalTransform} scale(1.2)`;
            
            // Store the timeout ID so we can cancel it if needed
            const shrinkTimeoutId = setTimeout(() => {
                // Shrink back
                markerElement.style.transform = originalTransform;
                
                pulseCount++;
                if (pulseCount < maxPulses) {
                    // Continue pulsing
                    const nextPulseTimeoutId = setTimeout(pulse, 300);
                    window.activeAnimations[markerId].push(nextPulseTimeoutId);
                } else {
                    // Reset z-index and transition after animation completes
                    const cleanupTimeoutId = setTimeout(() => {
                        markerElement.style.zIndex = '';
                        markerElement.style.transition = '';
                    }, 300);
                    window.activeAnimations[markerId].push(cleanupTimeoutId);
                }
            }, 300);
            
            window.activeAnimations[markerId].push(shrinkTimeoutId);
        }
        
        // Start the pulse animation
        pulse();
    };
    
    // Function to pulse a cluster (grow and shrink 3 times)
    function pulseCluster(markerId, cluster) {
        if (!cluster) return;
        
        // Get the cluster icon element
        const clusterElement = cluster._icon;
        if (!clusterElement) return;
        
        // Add CSS transition for smooth animation
        clusterElement.style.transition = 'transform 0.3s ease-in-out';
        
        // Save original transform and add CSS transform-origin to keep centered
        const originalTransform = clusterElement.style.transform || '';
        cluster._originalTransform = originalTransform;
        clusterElement.style.transformOrigin = 'center center';
        clusterElement.style.zIndex = 1000; // Bring to front
        
        // Define the animation
        let pulseCount = 0;
        const maxPulses = 3;
        
        function pulse() {
            // Grow by 20%
            clusterElement.style.transform = `${originalTransform} scale(1.2)`;
            
            // Store the timeout ID so we can cancel it if needed
            const shrinkTimeoutId = setTimeout(() => {
                // Shrink back
                clusterElement.style.transform = originalTransform;
                
                pulseCount++;
                if (pulseCount < maxPulses) {
                    // Continue pulsing
                    const nextPulseTimeoutId = setTimeout(pulse, 300);
                    window.activeAnimations[markerId].push(nextPulseTimeoutId);
                } else {
                    // Reset z-index and transition after animation completes
                    const cleanupTimeoutId = setTimeout(() => {
                        clusterElement.style.zIndex = '';
                        clusterElement.style.transition = '';
                    }, 300);
                    window.activeAnimations[markerId].push(cleanupTimeoutId);
                }
            }, 300);
            
            window.activeAnimations[markerId].push(shrinkTimeoutId);
        }
        
        // Start the pulse animation
        pulse();
    }
    
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
    const searchClear = document.getElementById('search-clear');
    let searchTimeout = null;
    let currentMarker = null;
    
    // Function to handle search input
    searchBox.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Show/hide clear button based on input content
        if (query !== '') {
            searchClear.classList.add('visible');
        } else {
            searchClear.classList.remove('visible');
        }
        
        // Clear any existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Clear search results if query is empty
        if (query === '') {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            searchBox.classList.remove('results-visible');
            return;
        }
        
        // Set a timeout to avoid making too many requests
        searchTimeout = setTimeout(() => {
            // Make API request to search for locations
            fetch(`/api/search?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    // Clear previous results
                    searchResults.innerHTML = '';
                    
                    // If no results, hide the results container
                    if (data.length === 0) {
                        searchResults.classList.remove('active');
                        searchBox.classList.remove('results-visible');
                        return;
                    }
                    
                    // Display results
                    data.forEach(location => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';
                        
                        // Create name element
                        const nameElement = document.createElement('div');
                        nameElement.className = 'result-name';
                        nameElement.textContent = location.name;
                        resultItem.appendChild(nameElement);
                        
                        // Create description element if available
                        if (location.description) {
                            const descElement = document.createElement('div');
                            descElement.className = 'result-description';
                            descElement.textContent = location.description;
                            resultItem.appendChild(descElement);
                        }
                        
                        // Add click event to fly to location
                        resultItem.addEventListener('click', function() {
                            // Fly to the location
                            map.flyTo([location.lat, location.lng], 14);
                            
                            // Clear any existing search results
                            searchResults.classList.remove('active');
                            searchBox.classList.remove('results-visible');
                            searchResults.innerHTML = '';
                            
                            // Format location details for display
                            let details = formatLocationDetails(location);
                            
                            // Set the search box value to the formatted details
                            searchBox.value = details;
                            
                            // Display location details in a toast or info box
                            displayLocationInfo(location);
                        });
                        
                        // Add to results container
                        searchResults.appendChild(resultItem);
                    });
                    
                    // Show results container
                    searchResults.classList.add('active');
                    searchBox.classList.add('results-visible');
                })
                .catch(error => {
                    console.error('Error searching for locations:', error);
                });
        }, 300); // 300ms delay
    });
    
    // Clear search box when X is clicked
    searchClear.addEventListener('click', function() {
        // Clear search box
        searchBox.value = '';
        
        // Hide clear button
        searchClear.classList.remove('visible');
        
        // Hide search results
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        searchBox.classList.remove('results-visible');
        
        // Focus on search box
        searchBox.focus();
    });
    
    // Show clear button if search box has content on page load
    if (searchBox.value.trim() !== '') {
        searchClear.classList.add('visible');
    }
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchBox.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.classList.remove('active');
            searchBox.classList.remove('results-visible');
        }
    });
    
    // Show results when search box is focused if it has content
    searchBox.addEventListener('focus', function() {
        if (this.value.trim() !== '' && searchResults.children.length > 0) {
            searchResults.classList.add('active');
            searchBox.classList.add('results-visible');
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
                
                // Track cluster changes to update our marker-to-cluster mapping
                markerCluster.on('clustered', function(event) {
                    window.updateClusterMapping();
                });
                
                // Also update cluster mapping when zoom changes
                map.on('zoomend', function() {
                    // Wait a bit for clusters to update
                    setTimeout(function() {
                        window.updateClusterMapping();
                    }, 300);
                });
                
                // Update cluster mapping when map moves
                map.on('moveend', function() {
                    // Wait a bit for clusters to update
                    setTimeout(function() {
                        window.updateClusterMapping();
                    }, 300);
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
                                
                                // Store marker in global object for access from dog_parks.js
                                if (location.type === 'dog_park') {
                                    window.dogParkMarkers[location.id] = centerMarker;
                                    
                                    // Add hover events for tooltip
                                    centerMarker.on('mouseover', function() {
                                        showMarkerTooltip(centerMarker, location.name);
                                    });
                                    
                                    centerMarker.on('mouseout', function() {
                                        hideMarkerTooltip();
                                    });
                                }
                                
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
