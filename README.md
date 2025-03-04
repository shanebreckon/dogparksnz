# Dog Parks NZ - Interactive Map Application

A web application that allows users to explore dog parks and dog-friendly areas across New Zealand through an interactive map interface. The application provides comprehensive information about each location and features advanced map visualization capabilities.

## Features

- Interactive map with advanced marker clustering
- Support for various geometry types (points, lines, polygons)
- Dynamic visibility of geometries based on zoom level
- Google Maps-inspired UI with multiple basemap options
- Detailed information about each dog park location
- RESTful API for CRUD operations
- Responsive design for desktop and mobile devices

## Map Visualization Enhancements

- **Advanced Marker Clustering**: Intelligently groups nearby locations for cleaner visualization
- **Dynamic Geometry Visibility**: Shows/hides geometries based on zoom level and cluster state
- **Multiple Basemap Options**: CartoDB Voyager (default) and Esri Satellite view
- **Back to Map Navigation**: Easy return to full map view after viewing specific locations
- **Custom Cluster Styling**: Google-inspired color scheme with count indicators

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript, Leaflet.js, Leaflet.markercluster
- **Backend**: Python Flask
- **Database**: SQLite (development), PostgreSQL with PostGIS (production)
- **Map Libraries**: Leaflet.js, Leaflet.draw, Leaflet.markercluster

## Setup and Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/DogParksNZv2.git
   cd DogParksNZv2
   ```

2. Create and activate a virtual environment (recommended)
   ```
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on the example
   ```
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Run the application
   ```
   python app.py
   ```

6. Access the application at `http://localhost:5000`

## Basic Usage

1. **Exploring the Map**:
   - Navigate the map using standard pan and zoom controls
   - Click on clusters to zoom in and see individual locations
   - Toggle between Map and Satellite view using the layer control

2. **Viewing Location Details**:
   - Click on a marker to view information about the location
   - For non-point geometries (polygons/lines), click on the shape to see details
   - Use the "Back to Map" button to return to the full map view

3. **Adding New Locations** (Admin):
   - Use the drawing tools to create new geometries
   - Fill in the name and description
   - Click "Save Drawing" to store the location

## Technical Implementation Details

- **Marker Clustering**: Uses Leaflet.markercluster with custom configuration
- **Geometry Management**: Tracks relationships between markers and actual geometries
- **Visibility Control**: Dynamic showing/hiding of geometries based on cluster state
- **Event Handling**: Responds to zoom, cluster animation, and spiderfy events

## Development Notes

- The clustering mechanism includes all geometry types in cluster counts
- Non-point geometries use invisible center markers for clustering
- Custom event handlers manage the visibility of geometries based on zoom level
- The application uses a Google-inspired color scheme for map elements

## Documentation

- [Contributing Guide](CONTRIBUTING.md) - How to contribute to this project
- [Changelog](CHANGELOG.md) - History of changes and versions
- [Development Guide](DEVELOPMENT.md) - Detailed development workflow
- [Troubleshooting](TROUBLESHOOTING.md) - Solutions to common issues
