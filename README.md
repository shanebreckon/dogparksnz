# Map Drawing Application

A web application that allows users to draw on maps and store the data in a database. This tool is designed to help users create, edit, and manage geographic data through an intuitive drawing interface.

## Features

- Web-based admin interface
- OpenStreetMap integration
- Drawing capabilities using Leaflet.js
- RESTful API for CRUD operations
- Support for various geometry types (points, lines, polygons)
- Persistent storage of map drawings

## Technology Stack

- Frontend: HTML, CSS, JavaScript, Leaflet.js
- Backend: Python Flask
- Database: SQLite (development), PostgreSQL with PostGIS (production)

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

1. **Creating a Drawing**:
   - Navigate to the main page
   - Use the drawing tools on the left side of the map
   - Fill in the name and description
   - Click "Save Drawing"

2. **Viewing Drawings**:
   - All saved drawings appear in the list on the right
   - Click "View" to see a drawing on the map

3. **Editing Drawings**:
   - Select a drawing from the list
   - Click "Edit"
   - Modify the drawing using the tools
   - Update the information and save

## Documentation

- [Contributing Guide](CONTRIBUTING.md) - How to contribute to this project
- [Changelog](CHANGELOG.md) - History of changes and versions
- [Development Guide](DEVELOPMENT.md) - Detailed development workflow
- [Troubleshooting](TROUBLESHOOTING.md) - Solutions to common issues

## Deployment

This application is configured for deployment to Azure via GitHub Actions. See the [Development Guide](DEVELOPMENT.md) for detailed deployment instructions.
