# Changelog

All notable changes to the Dog Parks NZ Application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Why This Document Exists

This changelog tracks the history of changes to the project, helping users and developers understand what has been added, fixed, or removed in each version. It serves as a historical record of the project's evolution and helps with debugging issues that may arise over time.

## [Unreleased]

### Added
- Center coordinates (lat/lng) for all geometry types
- Automatic calculation of center points for different geometry types:
  - Points: Uses the exact coordinates
  - Polylines: Uses the midpoint along the line
  - Polygons: Uses the centroid of the shape
- Center coordinates are stored in the database and included in API responses
- Future features will be listed here before they are released

### Changed
- Removed unused files and development utilities to streamline the codebase
- Transitioned fully to Azure SQL Database, removing SQLite database files
- Removed test_app.py Flask test file that was no longer needed
- Deleted templates/fixed_index.html duplicate template file
- Removed build.sh script as GitHub Actions is used for Azure deployment
- Deleted .deployment and deploy.sh files that were redundant with GitHub Actions workflow
- Removed requirements-azure.txt as it was identical to requirements.txt
- Deleted update_coordinates.py one-time utility script for database updates
- Removed update_types.py one-time utility script that was superseded by proper database migration
- Deleted runtime.txt as Python version is managed by GitHub Actions workflow

### Planned
- Search functionality for finding parks by name or features
- User accounts with favorites and reviews
- Mobile optimization with geolocation
- Advanced filtering options for park amenities
- Dark mode for improved night viewing
- Performance optimizations for large datasets

## [0.2.0] - 2025-03-05

### Added
- Advanced marker clustering with Leaflet.markercluster
- Multiple basemap options (CartoDB Voyager and Esri Satellite)
- Dynamic visibility management for non-point geometries
- "Back to Map" button for returning to full map view
- Custom cluster styling with Google-inspired color scheme
- Scale control for distance measurement
- Event listeners for spiderfied/unspiderfied clusters

### Changed
- Replaced default OpenStreetMap tiles with CartoDB Voyager
- Improved marker clustering to include all geometry types
- Enhanced geometry visibility based on zoom level and cluster state
- Optimized cluster click behavior

### Fixed
- Non-point geometries now properly show/hide based on cluster state
- Fixed visibility issues when zooming in/out
- Improved handling of geometry center points for clustering

## [0.1.0] - 2025-03-04

### Added
- Initial project setup
- Basic Flask application structure
- OpenStreetMap integration with Leaflet.js
- Drawing tools for creating map features
- RESTful API for CRUD operations on map drawings
- SQLite database for development
- PostgreSQL/PostGIS support for production
- GitHub Actions workflow for Azure deployment
- Basic HTML/CSS/JavaScript frontend
- Documentation files (README, CONTRIBUTING, CHANGELOG, etc.)

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- N/A (initial release)

## How to Update This File

When making changes to the project:

1. Add an entry to the "Unreleased" section for each change
2. Categorize changes under the appropriate heading (Added, Changed, etc.)
3. When releasing a new version:
   - Change "Unreleased" to the new version number and release date
   - Add a new "Unreleased" section at the top
   - Update links at the bottom of the file

[Unreleased]: https://github.com/yourusername/DogParksNZv2/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yourusername/DogParksNZv2/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourusername/DogParksNZv2/releases/tag/v0.1.0
