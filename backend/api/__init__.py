# API package - imports all API blueprints
from .auth import auth_bp
from .devices import devices_bp
from .streamers import streamers_bp
from .compute_units import compute_units_bp
from .favorites import favorites_bp
from .cameras import cameras_bp
from .apps import apps_bp
from .system import system_bp
from .anomaly_logs import anomaly_logs_bp
from .memory_set import memory_set_bp

def register_blueprints(app):
    """Register all API blueprints with the Flask app"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(devices_bp)
    app.register_blueprint(streamers_bp)
    app.register_blueprint(compute_units_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(cameras_bp)
    app.register_blueprint(apps_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(anomaly_logs_bp)
    app.register_blueprint(memory_set_bp)

__all__ = ['register_blueprints']
