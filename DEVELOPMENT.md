# Development Guide for Dog Parks NZ

This document provides detailed information about the development workflow for the Dog Parks NZ Application, with a focus on using Windsurf IDE and its AI assistant, Cascade.

## Why This Document Exists

This development guide ensures that all developers can replicate the same development environment and follow consistent workflows. It provides specific instructions for working with Windsurf and Cascade, helping developers leverage these tools effectively to streamline the coding process.

## Project Structure

```
DogParksNZv2/
├── .github/
│   └── workflows/       # GitHub Actions workflows
│       └── azure-deploy.yml
├── static/              # Static assets
│   ├── css/             # CSS stylesheets
│   │   └── style.css
│   └── js/              # JavaScript files
│       └── map.js
├── templates/           # HTML templates
│   └── index.html
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore file
├── app.py               # Main application entry point
├── models.py            # Database models
├── requirements.txt     # Python dependencies
├── routes.py            # API routes and endpoints
└── startup.txt          # Azure startup configuration
```

## Map Visualization Components

### Key JavaScript Files

- **map.js**: Contains all map initialization, clustering, and interaction logic
  - Handles marker clustering with Leaflet.markercluster
  - Manages geometry visibility based on zoom level
  - Implements custom cluster styling and behavior

### External Libraries

- **Leaflet.js**: Core mapping library
- **Leaflet.draw**: Drawing tools for creating geometries
- **Leaflet.markercluster**: Advanced clustering functionality

### CSS Components

- **style.css**: Contains styling for:
  - Marker clusters with Google-inspired color scheme
  - Back to Map button
  - Map controls and UI elements

## Map Clustering Implementation

### Marker to Geometry Mapping

The application uses a sophisticated approach to handle different geometry types:

```javascript
// Create a map to track which marker corresponds to which geometry
const markerToGeometryMap = new Map();

// For non-point geometries (polygons, lines)
const centerPoint = getCenterPoint(geometry);
const invisibleMarker = L.marker(centerPoint, {
    opacity: 0,
    interactive: false
});
markerToGeometryMap.set(invisibleMarker, geometryLayer);
```

### Visibility Management

Geometry visibility is controlled dynamically:

```javascript
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
        if (clusteredMarkers.has(marker)) {
            // If marker is in a cluster, hide the actual geometry
            geometry.setStyle({ opacity: 0, fillOpacity: 0 });
        } else {
            // If marker is not in a cluster, show the actual geometry
            geometry.setStyle({ opacity: 0.9, fillOpacity: 0.2 });
        }
    });
}
```

### Event Handling

The application listens to various events to update geometry visibility:

```javascript
// Update visibility on zoom and when clusters change
map.on('zoomend', updateGeometryVisibility);
markerCluster.on('animationend', updateGeometryVisibility);
markerCluster.on('spiderfied', updateGeometryVisibility);
markerCluster.on('unspiderfied', updateGeometryVisibility);
```

## Setting Up Windsurf for Development

### Installation

1. Download Windsurf from the [official website](https://windsurf.dev)
2. Install following the on-screen instructions
3. Launch Windsurf and open the project folder

### Configuration

1. **Python Environment**
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
   - Select "Python: Select Interpreter"
   - Choose your virtual environment

2. **Extensions**
   - Install recommended extensions:
     - Python
     - SQLite Viewer
     - Live Server (for frontend development)

3. **Windsurf Settings**
   - Open Settings (`Ctrl+,` or `Cmd+,`)
   - Configure Cascade AI settings if needed
   - Set up any custom keybindings

## Using Cascade for Development

Cascade is an AI assistant integrated with Windsurf that can help with various development tasks.

### Accessing Cascade

- Click the Cascade icon in the sidebar
- Use the keyboard shortcut `Ctrl+Shift+A` (or `Cmd+Shift+A` on macOS)
- Type `/cascade` in any editor window

### Common Cascade Commands

- `/help` - Get general help
- `/explain` - Explain selected code
- `/refactor` - Suggest refactoring for selected code
- `/test` - Generate tests for selected code
- `/docs` - Generate documentation for selected code

### Effective Use of Cascade

1. **Code Generation**
   - Describe the functionality you need
   - Be specific about requirements and edge cases
   - Review and modify generated code as needed

2. **Debugging**
   - Share error messages with Cascade
   - Explain what you expected to happen
   - Follow Cascade's suggestions for fixing issues

3. **Code Review**
   - Ask Cascade to review your code
   - Consider suggestions for improvements
   - Use Cascade to explain complex parts of the codebase

## Development Workflow

### Local Development

1. **Setup**
   - Clone the repository
   - Create and activate a virtual environment
   - Install dependencies
   - Create a `.env` file from `.env.example`

2. **Running the Application**
   - Start the Flask server: `python app.py`
   - Access the application at `http://localhost:5000`
   - Make changes to the code
   - Refresh the browser to see changes

3. **Working with Map Features**
   - Modify `map.js` for map-related functionality
   - Update `style.css` for styling changes
   - Use the browser console for debugging

4. **Database Operations**
   - Use SQLite for development
   - Access the database using SQLite Viewer extension
   - Test database migrations locally before deployment

### Testing

1. **Manual Testing**
   - Test map functionality across different zoom levels
   - Verify that clustering works correctly
   - Check that non-point geometries show/hide appropriately
   - Test the Back to Map button functionality

2. **Browser Compatibility**
   - Test in Chrome, Firefox, Safari, and Edge
   - Verify mobile responsiveness
   - Check touch interactions for mobile devices

### Deployment
### GitHub to Azure Deployment

1. **Prerequisites**
   - Azure account with an App Service plan
   - GitHub repository with the application code

2. **Setting Up GitHub Actions**
   - The repository includes a GitHub Actions workflow in `.github/workflows/azure-deploy.yml`
   - Add the following secrets to your GitHub repository:
     - `AZURE_WEBAPP_NAME`: The name of your Azure Web App
     - `AZURE_WEBAPP_PUBLISH_PROFILE`: The publish profile from Azure

3. **Deployment Process**
   - Push changes to the `main` branch
   - GitHub Actions will automatically deploy to Azure
   - Monitor the deployment in the Actions tab of your repository

4. **Post-Deployment**
   - Verify that the application is running correctly on Azure
   - Check logs for any errors
   - Update database configuration if needed

## Troubleshooting

For common issues and their solutions, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Additional Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
