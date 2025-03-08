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
    window.locationMap = map;
    
    // Create a global object to store markers by location ID
    window.locationMarkers = {};
    
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
            const marker = window.locationMarkers[markerId];
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
        
        const marker = window.locationMarkers[markerId];
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
    const searchResults = document.getElementById('search-results'); 
    const searchClear = document.getElementById('search-clear');
    const searchLoading = document.getElementById('search-loading');
    const searchIcon = document.getElementById('search-icon');
    const searchContainer = document.querySelector('.search-container');
    let searchTimeout = null;
    let currentMarker = null;
    
    // Function to handle search input
    searchBox.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Show/hide clear button
        if (query.length > 0) {
            searchClear.classList.add('visible');
            searchClear.style.display = 'block';
        } else {
            searchClear.classList.remove('visible');
            searchClear.style.display = 'none';
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            searchBox.classList.remove('results-visible');
            searchLoading.style.display = 'none';
            searchClear.style.display = 'none';
            searchIcon.classList.remove('search-icon-hidden');
            searchBox.value = '';
        }
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Hide any existing results while typing
        searchResults.classList.remove('active');
        searchBox.classList.remove('results-visible');
        
        // Set new timeout for search
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                // Hide search icon and show loading indicator
                searchIcon.classList.add('search-icon-hidden');
                searchLoading.style.display = 'block';
                searchClear.style.display = 'none';
                
                // Make API call to search endpoint
                fetch(`/api/search?q=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        // Hide loading indicator and show search icon again
                        searchLoading.style.display = 'none';
                        searchIcon.classList.remove('search-icon-hidden');
                        searchClear.style.display = 'block';
                        
                        // Clear previous results
                        searchResults.innerHTML = '';
                        
                        // Get results and suggestions from the response
                        const results = data.results || [];
                        const suggestions = data.suggestions || [];
                        
                        // Always show "No matching results found" message when there are no results
                        if (results.length === 0) {
                            // Show "No matching results found" message
                            const noResultsItem = document.createElement('div');
                            noResultsItem.className = 'search-no-results';
                            noResultsItem.textContent = 'No matching results found';
                            searchResults.appendChild(noResultsItem);
                            
                            // Show results container with the "No matching results found" message
                            searchResults.classList.add('active');
                            searchBox.classList.add('results-visible');
                            
                            // If we have suggestions, we would show them here (currently commented out)
                            if (suggestions.length > 0) {
                                /* Temporarily commented out "Did you mean" section
                                const suggestionsHeader = document.createElement('div');
                                suggestionsHeader.className = 'search-suggestions-header';
                                suggestionsHeader.textContent = 'Did you mean:';
                                searchResults.appendChild(suggestionsHeader);
                                
                                // Add each suggestion
                                suggestions.forEach(suggestion => {
                                    const suggestionItem = document.createElement('div');
                                    suggestionItem.className = 'search-suggestion-item';
                                    suggestionItem.textContent = suggestion;
                                    
                                    // Add click event to use this suggestion
                                    suggestionItem.addEventListener('click', function() {
                                        searchBox.value = suggestion;
                                        // Trigger a new search with this suggestion
                                        const event = new Event('input', { bubbles: true });
                                        searchBox.dispatchEvent(event);
                                    });
                                    
                                    searchResults.appendChild(suggestionItem);
                                });
                                */
                            }
                            
                            return;
                        }
                        
                        // Display results
                        results.forEach(location => {
                            const resultItem = document.createElement('div');
                            resultItem.className = 'search-result-item';
                            
                            // Create icon element based on location type
                            const iconElement = document.createElement('div');
                            iconElement.className = 'result-icon';
                            
                            // Check if location has location_type info
                            if (location.location_type && location.location_type.icon) {
                                // Use Material Icons
                                const iconSpan = document.createElement('span');
                                iconSpan.className = 'material-icons';
                                iconSpan.textContent = location.location_type.icon;
                                
                                // Use standard gray color for all icons
                                iconSpan.style.color = '#666666';
                                
                                iconElement.appendChild(iconSpan);
                            } else {
                                // Use default map marker icon
                                const iconSpan = document.createElement('span');
                                iconSpan.className = 'material-icons';
                                iconSpan.textContent = 'place';
                                iconSpan.style.color = '#666666';
                                
                                iconElement.appendChild(iconSpan);
                            }
                            
                            resultItem.appendChild(iconElement);
                            
                            // Create name element that will contain both name and description
                            const nameElement = document.createElement('div');
                            nameElement.className = 'result-name';
                            
                            // Create the combined text with name in bold and description normal
                            let combinedText = location.name;
                            
                            // Add description if available
                            if (location.description) {
                                // Add the description with a space separator
                                combinedText += ' ' + location.description;
                            }
                            
                            // Use a span for the name part to make it bold
                            nameElement.innerHTML = `<span style="font-weight: 500;">${location.name}</span>`;
                            
                            // Add the description part if available
                            if (location.description) {
                                nameElement.innerHTML += ` <span style="color: #666;">${location.description}</span>`;
                            }
                            
                            resultItem.appendChild(nameElement);
                            
                            // Add click event to fly to location
                            resultItem.addEventListener('click', function() {
                                // Fly to the location
                                map.flyTo([location.lat, location.lng], 14);
                                
                                // Clear any existing search results
                                searchResults.classList.remove('active');
                                searchBox.classList.remove('results-visible');
                                searchResults.innerHTML = '';
                                
                                // Keep the search container expanded since we have content
                                searchContainer.classList.add('expanded');
                                
                                // Format location details for display
                                let details = formatLocationDetails(location);
                                
                                // Set the search box value to the formatted details
                                searchBox.value = details;
                                
                                // Only show the red marker for map locations (not location types from DB)
                                // Check if this is a search result location from Photon API
                                if (location.source === 'photon') {
                                    // Remove any existing marker
                                    if (currentMarker) {
                                        map.removeLayer(currentMarker);
                                    }
                                    
                                    // Add a red pin marker at the location
                                    currentMarker = L.marker([location.lat, location.lng], {
                                        icon: L.divIcon({
                                            className: 'custom-pin-marker',
                                            html: '<span class="material-icons" style="color: #e53935; font-size: 32px;">place</span>',
                                            iconSize: [32, 32],
                                            iconAnchor: [16, 32]
                                        })
                                    }).addTo(map);
                                } else {
                                    // For location types from DB, remove any existing marker
                                    if (currentMarker) {
                                        map.removeLayer(currentMarker);
                                        currentMarker = null;
                                    }
                                }
                                
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
                        // Hide loading indicator on error
                        searchLoading.style.display = 'none';
                        searchClear.style.display = 'block';
                        console.error('Error searching for locations:', error);
                    });
            }
        }, 300); // 300ms delay
    });
    
    // Clear search box when X is clicked
    searchClear.addEventListener('click', function(event) {
        // Prevent the event from propagating to document click handler
        event.stopPropagation();
        
        searchBox.value = '';
        this.classList.remove('visible');
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        searchBox.classList.remove('results-visible');
        searchLoading.style.display = 'none';
        searchClear.style.display = 'none';
        searchIcon.classList.remove('search-icon-hidden');
        
        // Ensure the search container stays expanded since the search box still has focus
        searchContainer.classList.add('expanded');
        
        // Place cursor in the search box
        searchBox.focus();
    });
    
    // Show clear button if search box has content on page load
    if (searchBox.value.trim() !== '') {
        searchClear.classList.add('visible');
    }
    
    // Show results when search box is focused if it has content
    searchBox.addEventListener('focus', function() {
        // Expand the search container
        searchContainer.classList.add('expanded');
        
        // Select all text in the search box when focused
        if (this.value.trim() !== '') {
            this.select();
        }
        
        if (this.value.trim() !== '' && searchResults.children.length > 0) {
            searchResults.classList.add('active');
            searchBox.classList.add('results-visible');
        }
    });
    
    // Contract the search container when focus is lost and there are no results showing
    searchBox.addEventListener('blur', function() {
        // Only contract if search results are not active AND the search box is empty
        if (!searchResults.classList.contains('active') && this.value.trim() === '') {
            searchContainer.classList.remove('expanded');
        }
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchBox.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.classList.remove('active');
            searchBox.classList.remove('results-visible');
            
            // Only contract if the search box is empty
            if (searchBox.value.trim() === '') {
                searchContainer.classList.remove('expanded');
            }
        }
    });
    
    // Function to apply styling based on location type
    function applyLocationStyling(layer, locationTypeId, locationTypeInfo) {
        // If we have location type info from the API, use that
        if (locationTypeInfo) {
            if (layer.setStyle) {
                layer.setStyle({
                    color: locationTypeInfo.color,
                    fillColor: '#FFFFFF',
                    fillOpacity: 0.8,
                    weight: 3,
                    opacity: 0.9
                });
            }
        } else {
            // Fallback to old method using type ID
            if (locationTypeId === 2) { // Vet type ID is 2
                applyVetStyling(layer);
            } else {
                // Default to dog_park styling (type ID 1)
                applyDogParkStyling(layer);
            }
        }
    }
    
    // Function to apply dog park styling
    function applyDogParkStyling(layer) {
        if (layer.setStyle) {
            layer.setStyle({
                color: '#2E7D32',  // Green outline
                fillColor: '#FFFFFF',  // White background
                fillOpacity: 0.8,
                weight: 3,
                opacity: 0.9
            });
        }
    }
    
    // Function to apply vet styling
    function applyVetStyling(layer) {
        if (layer.setStyle) {
            layer.setStyle({
                color: '#1565C0',  // Blue outline
                fillColor: '#FFFFFF',  // White background
                fillOpacity: 0.8,
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
                
                // Create a single marker cluster group for all location types
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
                
                locations.forEach(location => {
                    try {
                        // Only process dog_park locations
                        if (location.type === 1 || location.type === 2) {
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
                                applyLocationStyling(layer, location.type, location.location_type);
                                
                                nonPointLayers.addLayer(layer);
                            });
                            
                            // Create a marker at the center coordinates
                            if (location.lat !== null && location.lng !== null) {
                                const centerLatLng = L.latLng(location.lat, location.lng);
                                
                                // Get location type information
                                const locationType = location.location_type || { 
                                    short_name: location.type === 1 ? 'dog_park' : 'vet',
                                    icon: location.type === 1 ? 'pets' : 'local_hospital',
                                    color: location.type === 1 ? '#2E7D32' : '#1565C0'
                                };
                                
                                // Create a visible marker for the center point
                                const centerMarker = L.marker(centerLatLng, {
                                    icon: L.divIcon({
                                        className: locationType.short_name === 'vet' ? 'vet-marker' : 'paw-marker',
                                        html: `<i class="material-icons" style="color: ${locationType.color}">${locationType.icon}</i>`,
                                        iconSize: [30, 30],
                                        iconAnchor: [15, 15]
                                    })
                                });
                                
                                // Add data to the marker for reference
                                centerMarker.locationId = location.id;
                                centerMarker.drawingType = location.geometry.type;
                                centerMarker.locationType = locationType.short_name;
                                centerMarker.locationTypeId = location.type; // The type field is now the location_type_id
                                
                                // Store marker in global object for access from locations.js
                                window.locationMarkers[location.id] = centerMarker;
                                
                                // Add hover events for tooltip
                                centerMarker.on('mouseover', function() {
                                    showMarkerTooltip(centerMarker, location.name);
                                });
                                
                                centerMarker.on('mouseout', function() {
                                    hideMarkerTooltip();
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
                markerCluster.addTo(map);
                
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
                    // Create a bounds object that includes both types of locations
                    const combinedBounds = markerCluster.getBounds();
                    
                    map.fitBounds(combinedBounds, {
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
        
        // Add description if available
        if (location.description) {
            if (typeof location.description === 'string') {
                details.push(location.description);
            } else if (Array.isArray(location.description)) {
                details.push(location.description.join(', '));
            }
        }
        
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
