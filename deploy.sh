#!/bin/bash
set -e

echo "Starting deployment script..."

# Navigate to the project directory
cd "$DEPLOYMENT_TARGET" || cd /home/site/wwwroot

echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"

# Upgrade pip
echo "Upgrading pip..."
python -m pip install --upgrade pip

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

# Start the application
gunicorn --bind=0.0.0.0 --timeout 600 app:app

echo "Deployment script completed successfully!"
