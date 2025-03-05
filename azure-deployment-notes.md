# Azure Deployment Troubleshooting

## Issues Identified in Logs

1. **Missing urllib Import**:
   ```
   NameError: name 'urllib' is not defined
   ```

2. **Missing Dependencies**:
   ```
   ModuleNotFoundError: No module named 'flask_sqlalchemy'
   ```

## Fixed Issues

1. Added missing `import urllib.parse` to app.py
2. Verified requirements.txt has all necessary dependencies

## Deployment Checklist

1. Make sure the following files are properly configured:
   - requirements.txt - Contains all dependencies
   - startup.txt - Proper startup commands
   - app.py - All imports are present

2. Azure App Service Configuration:
   - Set startup command to: `startup.txt`
   - Set Python version to 3.9
   - Verify environment variables are set correctly

3. Database Connection:
   - Ensure DATABASE_URL environment variable is properly set in Azure
   - Check that the SQL Server driver is available in the Azure environment

## Deployment Steps

1. Commit and push all changes to your repository
2. Deploy to Azure using your preferred method (GitHub Actions, Azure DevOps, or direct deployment)
3. Monitor logs after deployment to verify successful startup

## Common Azure App Service Python Issues

1. **Missing Dependencies**: Ensure all packages are in requirements.txt
2. **Startup Command**: Make sure startup.txt is properly formatted and executable
3. **Environment Variables**: Check that all required environment variables are set
4. **Python Version**: Verify the Python version in Azure matches your development environment
5. **Database Drivers**: Ensure the correct database drivers are installed and configured
