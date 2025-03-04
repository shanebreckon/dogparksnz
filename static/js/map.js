document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map
    const map = L.map('map').setView([-41.2865, 174.7762], 13); // Default to Wellington, NZ
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
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
            properties: {}
        };
        
        // Determine if we're creating or updating
        const url = currentDrawingId 
            ? `/api/drawings/${currentDrawingId}` 
            : '/api/drawings';
        const method = currentDrawingId ? 'PUT' : 'POST';
        
        // Send to API
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(drawingData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            alert('Drawing saved successfully!');
            clearForm();
            loadDrawings();
        })
        .catch(error => {
            console.error('Error saving drawing:', error);
            alert('Error saving drawing. Please try again.');
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
        fetch('/api/drawings')
            .then(response => response.json())
            .then(drawings => {
                const drawingsList = document.getElementById('drawings');
                drawingsList.innerHTML = '';
                
                drawings.forEach(drawing => {
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
                });
            })
            .catch(error => {
                console.error('Error loading drawings:', error);
            });
    }
    
    // Function to view a drawing
    function viewDrawing(drawing) {
        // Clear existing layers
        drawnItems.clearLayers();
        
        // Add the GeoJSON to the map
        const geoJSONLayer = L.geoJSON(drawing.geometry);
        geoJSONLayer.eachLayer(layer => {
            drawnItems.addLayer(layer);
        });
        
        // Zoom to the drawing
        map.fitBounds(drawnItems.getBounds());
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
            fetch(`/api/drawings/${id}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
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
                alert('Error deleting drawing. Please try again.');
            });
        }
    }
    
    // Load drawings when page loads
    loadDrawings();
});
