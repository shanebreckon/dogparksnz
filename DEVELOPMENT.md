# Development Guide

This document provides detailed information about the development workflow for the Map Drawing Application, with a focus on using Windsurf IDE and its AI assistant, Cascade.

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

3. **Making Changes**
   - Create a new branch for your feature/fix
   - Make your changes
   - Test your changes locally
   - Commit with clear messages

### Database Management

1. **Local SQLite Database**
   - The application uses SQLite by default for development
   - The database file is created automatically on first run
   - Use SQLite Viewer extension to inspect the database

2. **PostgreSQL for Production**
   - Configure PostgreSQL connection in `.env` file
   - Install PostGIS extension for spatial data

### Testing

1. **Manual Testing**
   - Test all features after making changes
   - Verify that drawings can be created, viewed, edited, and deleted
   - Check that the map and drawing tools work correctly

2. **Automated Testing**
   - Run tests with `pytest`
   - Add new tests for new features

## Deployment

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
