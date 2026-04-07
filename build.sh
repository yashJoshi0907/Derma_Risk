#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing required Python packages..."
pip install -r requirements.txt

echo "Downloading models from Google Drive..."
python download_models.py

echo "Build process completed successfully."
