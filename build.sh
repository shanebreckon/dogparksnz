#!/bin/bash
echo "Installing dependencies..."
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Copy Azure environment file
echo "Setting up Azure environment..."
if [ -f .env.azure ]; then
  cp .env.azure .env
  echo "Azure environment file copied to .env"
fi

echo "Dependencies installed successfully!"
