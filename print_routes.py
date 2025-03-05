from app import app
from flask import url_for

def print_routes():
    """Print all available routes in the Flask app."""
    with app.test_request_context():
        print("Available routes:")
        for rule in app.url_map.iter_rules():
            print(f"{rule.endpoint}: {rule}")

if __name__ == "__main__":
    print_routes()
