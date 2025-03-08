document.addEventListener('DOMContentLoaded', function() {
    const locationsList = document.getElementById('locations-list');
    let allLocations = []; // Store all locations data
    let visibleLocations = []; // Store locations visible in the current map view
    let currentPage = 1;
    const locationsPerPage = 3;
    
    // Add a loading indicator
    locationsList.innerHTML = '<div class="loading">Loading locations...</div>';
    
    // Function to fetch all locations
    function fetchLocations() {
        // Use type parameter to filter by location type if needed
        fetch('/api/locations')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Store all locations data
                allLocations = data.data || [];
                
                // Clear loading indicator
                locationsList.innerHTML = '';
                
                if (allLocations.length === 0) {
                    locationsList.innerHTML = '<div class="no-locations">No locations found in the database.</div>';
                    return;
                }
                
                // Wait for the map to be initialized
                waitForMap();
            })
            .catch(error => {
                console.error('Error fetching locations:', error);
                locationsList.innerHTML = `<div class="error">Error loading locations: ${error.message}</div>`;
            });
    }
    
    // Function to wait for map to be initialized
    function waitForMap() {
        if (window.locationMap) {
            // Map is ready, set up event listeners and filter locations
            setupMapEvents();
            filterLocationsByMapBounds();
        } else {
            // Check again in 100ms
            setTimeout(waitForMap, 100);
        }
    }
    
    // Function to set up map event listeners
    function setupMapEvents() {
        // Filter locations when map moves or zooms
        window.locationMap.on('moveend', filterLocationsByMapBounds);
        window.locationMap.on('zoomend', filterLocationsByMapBounds);
        
        // Initial filter
        filterLocationsByMapBounds();
    }
    
    // Function to filter locations by current map bounds
    function filterLocationsByMapBounds() {
        // Get current map bounds
        const bounds = window.locationMap.getBounds();
        
        // Filter locations to only those within the current bounds
        visibleLocations = allLocations.filter(location => {
            if (!location.lat || !location.lng) return false;
            return bounds.contains([location.lat, location.lng]);
        });
        
        // Reset to first page when filter changes
        currentPage = 1;
        
        // Update cluster mapping after map movement
        if (typeof window.updateClusterMapping === 'function') {
            setTimeout(() => {
                window.updateClusterMapping();
            }, 300); // Wait for clusters to update
        }
        
        // Render the filtered locations
        renderPage();
    }
    
    // Function to render a specific page of locations
    function renderPage() {
        // Clear current content
        locationsList.innerHTML = '';
        
        // Add header with visible count and total count
        const header = document.createElement('h2');
        header.className = 'locations-header';
        header.textContent = `Locations (${visibleLocations.length} visible of ${allLocations.length} total)`;
        locationsList.appendChild(header);
        
        // Show message if no locations are visible
        if (visibleLocations.length === 0) {
            const noLocationVisible = document.createElement('div');
            noLocationVisible.className = 'no-locations';
            noLocationVisible.textContent = 'No locations visible in current map view. Pan or zoom out to see more locations.';
            locationsList.appendChild(noLocationVisible);
            return;
        }
        
        // Calculate start and end indices for the current page
        const startIndex = (currentPage - 1) * locationsPerPage;
        const endIndex = Math.min(startIndex + locationsPerPage, visibleLocations.length);
        
        // Get locations for the current page
        const currentLocations = visibleLocations.slice(startIndex, endIndex);
        
        // Create cards for each location in the current page
        currentLocations.forEach(location => {
            const card = document.createElement('div');
            card.className = 'location-card';
            
            // Format description - use a default if not available
            const description = location.description || 'No description available';
            
            // Format coordinates for better display
            const lat = location.lat ? location.lat.toFixed(4) : 'N/A';
            const lng = location.lng ? location.lng.toFixed(4) : 'N/A';
            
            // Get location type information
            const locationType = location.location_type ? location.location_type.short_name : 'unknown';
            
            card.innerHTML = `
                <h3>${location.name}</h3>
                <p class="location-type">${locationType}</p>
                <p>${description}</p>
                <p class="location">Coordinates: ${lat}, ${lng}</p>
            `;
            
            // Add hover event to pulse the marker
            card.addEventListener('mouseenter', function() {
                if (window.pulseMarker && location.id) {
                    window.pulseMarker(location.id);
                }
            });
            
            // Add mouseout event to stop the animation
            card.addEventListener('mouseleave', function() {
                if (window.stopMarkerAnimation && location.id) {
                    window.stopMarkerAnimation(location.id);
                }
            });
            
            // Add to the list
            locationsList.appendChild(card);
        });
        
        // Add pagination controls if needed
        if (visibleLocations.length > locationsPerPage) {
            addPaginationControls();
        }
    }
    
    // Function to add pagination controls
    function addPaginationControls() {
        const totalPages = Math.ceil(visibleLocations.length / locationsPerPage);
        
        // Create pagination container
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        
        // Add page info
        const pageInfo = document.createElement('div');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationContainer.appendChild(pageInfo);
        
        // Add pagination buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'pagination-buttons';
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-button';
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });
        buttonsContainer.appendChild(prevButton);
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
            }
        });
        buttonsContainer.appendChild(nextButton);
        
        // Add buttons container to pagination container
        paginationContainer.appendChild(buttonsContainer);
        
        // Add pagination container to the list
        locationsList.appendChild(paginationContainer);
    }
    
    // Start fetching locations
    fetchLocations();
});
