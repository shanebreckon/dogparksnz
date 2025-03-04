# Troubleshooting Guide

This document provides solutions to common issues you might encounter when developing or using the Map Drawing Application.

## Why This Document Exists

This troubleshooting guide helps users and developers quickly resolve common problems without having to rediscover solutions. It saves time, reduces frustration, and provides a central resource for addressing issues specific to this project and the tools it uses.

## Development Issues

### Python Environment Problems

#### Issue: Package installation fails
**Solution:**
- Ensure your virtual environment is activated
- Try updating pip: `pip install --upgrade pip`
- Check for conflicting dependencies in requirements.txt
- On Windows, some packages may require Visual C++ Build Tools

#### Issue: Import errors when running the application
**Solution:**
- Verify that all dependencies are installed: `pip install -r requirements.txt`
- Check that you're running the application from the project root
- Ensure your PYTHONPATH includes the project directory

### Database Issues

#### Issue: Database migration errors
**Solution:**
- Delete the existing SQLite database file and let it recreate
- Check the database URL in your `.env` file
- Ensure database permissions are set correctly

#### Issue: PostgreSQL connection issues
**Solution:**
- Verify PostgreSQL is running
- Check connection string parameters in `.env`
- Ensure PostGIS extension is installed for spatial features
- Check network connectivity and firewall settings

## Frontend Issues

### Map Display Problems

#### Issue: Map doesn't load
**Solution:**
- Check browser console for JavaScript errors
- Verify internet connection (OpenStreetMap tiles require internet)
- Clear browser cache and reload
- Ensure Leaflet.js is loading correctly

#### Issue: Drawing tools don't appear
**Solution:**
- Check that Leaflet.Draw is properly loaded
- Look for JavaScript errors in the console
- Verify that the CSS for Leaflet.Draw is loaded

### Form Submission Issues

#### Issue: Can't save drawings
**Solution:**
- Check browser console for AJAX errors
- Verify that the API endpoint is responding
- Ensure the form data is formatted correctly
- Check for validation errors in the backend logs

## Deployment Issues

### Azure Deployment Problems

#### Issue: ModuleNotFoundError: No module named 'flask_sqlalchemy'
**Solution:**
- Update your startup.txt file to include `pip install -r requirements.txt` before the gunicorn command
- Add a proper deployment script with the following files:
  - `.deployment` file to specify the deployment command
  - `deploy.sh` script to handle dependency installation
  - `web.config` file for IIS configuration
  - `runserver.py` for Azure to execute the application
- Verify that Flask-SQLAlchemy is listed in your requirements.txt file
- Check Azure logs to ensure dependencies are being installed correctly
- If the issue persists, try manually installing the package via Azure's Kudu console

#### Issue: Azure deployment fails with dependency errors
**Solution:**
- SSH into your Azure Web App using the Kudu console
- Navigate to the site/wwwroot directory
- Manually run `pip install -r requirements.txt` to see specific errors
- Check if your Python version on Azure matches your local development environment
- Ensure all dependencies in requirements.txt have compatible versions
- Try adding `--no-cache-dir` to pip install commands if space is an issue

#### Issue: GitHub Actions deployment fails
**Solution:**
- Check the GitHub Actions logs for specific errors
- Verify that GitHub secrets are configured correctly
- Ensure the Azure Web App exists and is properly configured
- Check that the publish profile is current

#### Issue: Application deploys but doesn't run
**Solution:**
- Check Azure App Service logs
- Verify that environment variables are set in Azure
- Ensure the startup command is correct
- Check for any missing dependencies

#### Issue: ZIP Deploy fails with "Deployment Failed" message
**Solution:**
- Simplify your deployment configuration by removing complex files like `.deployment` and `web.config`
- Use a minimal `startup.txt` file with just the essential commands
- Ensure all files have proper line endings (LF instead of CRLF)
- Check Azure App Service logs for specific error messages
- Try deploying via Git instead of ZIP if problems persist
- Verify your Azure App Service plan supports Python applications

## Windsurf and Cascade Issues

### Windsurf IDE Problems

#### Issue: Windsurf doesn't recognize Python interpreter
**Solution:**
- Manually select the interpreter in settings
- Restart Windsurf
- Check that the virtual environment is activated

#### Issue: Extensions don't load
**Solution:**
- Check internet connection
- Reinstall the extension
- Update Windsurf to the latest version

### Cascade AI Assistant Issues

#### Issue: Cascade doesn't provide relevant suggestions
**Solution:**
- Be more specific in your queries
- Provide more context about what you're trying to accomplish
- Break down complex questions into simpler ones

#### Issue: Cascade generates incorrect code
**Solution:**
- Review the generated code carefully
- Provide feedback to Cascade about the issues
- Modify the code as needed
- Try rephrasing your request

## How to Update This Document

As you encounter and solve new issues:

1. Document the problem clearly
2. Provide step-by-step solutions
3. Include any relevant error messages
4. Add the new issue to the appropriate section
5. If applicable, link to external resources for more information

## Getting Additional Help

If you encounter an issue not covered in this guide:

1. Check the project's GitHub Issues
2. Search for similar problems in Stack Overflow
3. Create a new issue in the GitHub repository
4. Reach out to the project maintainers

Remember to include:
- A clear description of the problem
- Steps to reproduce the issue
- Your environment details (OS, browser, etc.)
- Any error messages or logs
