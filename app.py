from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure database
database_url = os.getenv('DATABASE_URL')

# Handle Azure-specific connection string format if needed
if database_url and 'mssql+pyodbc' in database_url:
    # Check if we're running in Azure (WEBSITE_SITE_NAME is set in Azure App Service)
    if os.environ.get('WEBSITE_SITE_NAME'):
        # Parse the existing connection string
        parts = database_url.split('://')
        if len(parts) == 2:
            dialect = parts[0]
            connection_details = parts[1]
            
            # Split at the @ symbol to separate credentials from server details
            if '@' in connection_details:
                credentials, server_details = connection_details.split('@', 1)
                username, password = credentials.split(':', 1)
                
                # URL encode the password to handle special characters
                encoded_password = urllib.parse.quote_plus(password)
                
                # Reconstruct the connection string with encoded password
                database_url = f"{dialect}://{username}:{encoded_password}@{server_details}"
                
                # Make sure the driver is specified correctly for Azure
                if 'driver=' in database_url.lower():
                    # Azure App Service has ODBC Driver 17 for SQL Server pre-installed
                    if 'odbc+driver+17' not in database_url.lower().replace(' ', '+'):
                        database_url = database_url.replace(
                            'driver=ODBC+Driver+17+for+SQL+Server', 
                            'driver=ODBC+Driver+17+for+SQL+Server'
                        )
                else:
                    # Add driver if missing
                    database_url += "&driver=ODBC+Driver+17+for+SQL+Server"

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

from flask_migrate import Migrate

# Initialize the database and migration
migrate = Migrate(app, db)

# Import routes after app initialization to avoid circular imports
from routes import *

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
