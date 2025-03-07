document.addEventListener('DOMContentLoaded', function() {
    const parksList = document.getElementById('dog-parks-list');
    let allParks = []; // Store all parks data
    let visibleParks = []; // Store parks visible in the current map view
    let currentPage = 1;
    const parksPerPage = 3;
    
    // Add a loading indicator
    parksList.innerHTML = '<div class="loading">Loading dog parks...</div>';
    
    // Function to fetch all dog parks
    function fetchDogParks() {
        fetch('/api/dog_parks')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Store all parks data
                allParks = data;
                
                // Clear loading indicator
                parksList.innerHTML = '';
                
                if (allParks.length === 0) {
                    parksList.innerHTML = '<div class="no-parks">No dog parks found in the database.</div>';
                    return;
                }
                
                // Wait for the map to be initialized
                waitForMap();
            })
            .catch(error => {
                console.error('Error fetching dog parks:', error);
                parksList.innerHTML = `<div class="error">Error loading dog parks: ${error.message}</div>`;
            });
    }
    
    // Function to wait for map to be initialized
    function waitForMap() {
        if (window.dogParksMap) {
            // Map is ready, set up event listeners and filter parks
            setupMapEvents();
            filterParksByMapBounds();
        } else {
            // Check again in 100ms
            setTimeout(waitForMap, 100);
        }
    }
    
    // Function to set up map event listeners
    function setupMapEvents() {
        // Filter parks when map moves or zooms
        window.dogParksMap.on('moveend', filterParksByMapBounds);
        window.dogParksMap.on('zoomend', filterParksByMapBounds);
        
        // Initial filter
        filterParksByMapBounds();
    }
    
    // Function to filter parks by current map bounds
    function filterParksByMapBounds() {
        // Get current map bounds
        const bounds = window.dogParksMap.getBounds();
        
        // Filter parks to only those within the current bounds
        visibleParks = allParks.filter(park => {
            if (!park.lat || !park.lng) return false;
            return bounds.contains([park.lat, park.lng]);
        });
        
        // Reset to first page when filter changes
        currentPage = 1;
        
        // Update cluster mapping after map movement
        if (typeof window.updateClusterMapping === 'function') {
            setTimeout(() => {
                window.updateClusterMapping();
            }, 300); // Wait for clusters to update
        }
        
        // Render the filtered parks
        renderPage();
    }
    
    // Function to render a specific page of parks
    function renderPage() {
        // Clear current content
        parksList.innerHTML = '';
        
        // Add header with visible count and total count
        const header = document.createElement('h2');
        header.className = 'parks-header';
        header.textContent = `Dog Parks (${visibleParks.length} visible of ${allParks.length} total)`;
        parksList.appendChild(header);
        
        // Show message if no parks are visible
        if (visibleParks.length === 0) {
            const noParkVisible = document.createElement('div');
            noParkVisible.className = 'no-parks';
            noParkVisible.textContent = 'No dog parks visible in current map view. Pan or zoom out to see more parks.';
            parksList.appendChild(noParkVisible);
            return;
        }
        
        // Calculate start and end indices for the current page
        const startIndex = (currentPage - 1) * parksPerPage;
        const endIndex = Math.min(startIndex + parksPerPage, visibleParks.length);
        
        // Get parks for the current page
        const currentParks = visibleParks.slice(startIndex, endIndex);
        
        // Create cards for each park in the current page
        currentParks.forEach(park => {
            const card = document.createElement('div');
            card.className = 'park-card';
            
            // Format description - use a default if not available
            const description = park.description || 'No description available';
            
            // Format coordinates for better display
            const lat = park.lat ? park.lat.toFixed(4) : 'N/A';
            const lng = park.lng ? park.lng.toFixed(4) : 'N/A';
            
            card.innerHTML = `
                <h3>${park.name}</h3>
                <p>${description}</p>
                <p class="location">Coordinates: ${lat}, ${lng}</p>
            `;
            
            // Add hover event to pulse the marker
            card.addEventListener('mouseenter', function() {
                if (window.pulseMarker && park.id) {
                    window.pulseMarker(park.id);
                }
            });
            
            // Add mouseout event to stop the animation
            card.addEventListener('mouseleave', function() {
                if (window.stopMarkerAnimation && park.id) {
                    window.stopMarkerAnimation(park.id);
                }
            });
            
            // Add to the list
            parksList.appendChild(card);
        });
        
        // Add pagination controls if needed
        if (visibleParks.length > parksPerPage) {
            addPaginationControls();
        }
    }
    
    // Function to add pagination controls
    function addPaginationControls() {
        const totalPages = Math.ceil(visibleParks.length / parksPerPage);
        
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
        
        // Add pagination container to parks list
        parksList.appendChild(paginationContainer);
    }
    
    // Start fetching dog parks
    fetchDogParks();
});
