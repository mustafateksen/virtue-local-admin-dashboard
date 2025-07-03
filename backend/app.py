# type: ignore
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
import datetime
import logging
import threading
import time

# Local imports
from config import Config
from models import db
from api import register_blueprints
from utils.ping import ping_device
from utils.system_stats import get_device_stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    """Application factory"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)
    jwt = JWTManager(app)
    
    # Configure CORS
    CORS(app, origins=Config.CORS_ORIGINS, 
         methods=Config.CORS_METHODS,
         allow_headers=Config.CORS_HEADERS)
    
    # Register API blueprints
    register_blueprints(app)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'message': 'Endpoint not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'message': 'Internal server error'}, 500

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token has expired'}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'message': 'Invalid token'}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'message': 'Authorization token required'}, 401
    
    return app

def create_tables(app):
    """Initialize database"""
    with app.app_context():
        db.create_all()
        logger.info("Database tables created")

def monitor_devices():
    """Background task to monitor device status"""
    while True:
        try:
            from models import RaspberryDevice
            with app.app_context():
                devices = RaspberryDevice.query.all()
                for device in devices:
                    if ping_device(device.ip_address):
                        device.status = 'online'
                        device.last_seen = datetime.datetime.utcnow()
                        
                        # Get updated stats
                        stats = get_device_stats(device.ip_address)
                        if stats:
                            device.cpu_usage = stats['cpu_usage']
                            device.memory_usage = stats['memory_usage']
                            device.disk_usage = stats['disk_usage']
                            device.temperature = stats['temperature']
                            device.uptime = stats['uptime']
                            
                            # Set warning status if any metric is high
                            if (device.cpu_usage > 90 or 
                                device.memory_usage > 90 or 
                                device.disk_usage > 95 or 
                                device.temperature > 80):
                                device.status = 'warning'
                    else:
                        device.status = 'offline'
                
                db.session.commit()
        except Exception as e:
            logger.error(f"Error in device monitoring: {e}")
        
        # Wait 30 seconds before next check
        time.sleep(30)

if __name__ == '__main__':
    app = create_app()
    
    # Create database tables
    create_tables(app)
    
    # Start device monitoring in background thread
    monitor_thread = threading.Thread(target=monitor_devices, daemon=True)
    monitor_thread.start()
    
    # Run the application
    app.run(host='0.0.0.0', port=8001, debug=True)
