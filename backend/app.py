# type: ignore
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_restful import Api, Resource
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import os
import psutil
import datetime
import json
import time
import threading
import requests
from typing import Dict, List, Optional
import logging

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///virtue_admin.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=8)

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
api = Api(app)
# Allow CORS for all origins (network access support)
CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
     allow_headers=["Content-Type", "Authorization"])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='admin')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'username': self.username,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class RaspberryDevice(db.Model):
    __tablename__ = 'raspberry_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(15), unique=True, nullable=False)
    status = db.Column(db.String(20), default='offline')  # online, offline, warning
    last_seen = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # System metrics (updated periodically)
    cpu_usage = db.Column(db.Float, default=0.0)
    memory_usage = db.Column(db.Float, default=0.0)
    disk_usage = db.Column(db.Float, default=0.0)
    temperature = db.Column(db.Float, default=0.0)
    uptime = db.Column(db.String(50), default='0d 0h 0m')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'ipAddress': self.ip_address,
            'status': self.status,
            'lastSeen': self.last_seen.strftime('%Y-%m-%d %H:%M:%S') if self.last_seen else None,
            'cpuUsage': self.cpu_usage,
            'memoryUsage': self.memory_usage,
            'diskUsage': self.disk_usage,
            'temperature': self.temperature,
            'uptime': self.uptime,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Streamer(db.Model):
    __tablename__ = 'streamers'
    
    id = db.Column(db.Integer, primary_key=True)
    streamer_uuid = db.Column(db.String(100), unique=True, nullable=False)
    streamer_type = db.Column(db.String(50), nullable=False)  # camera, io, etc.
    streamer_hr_name = db.Column(db.String(100), nullable=False)
    config_template_name = db.Column(db.String(100), nullable=False)
    is_alive = db.Column(db.String(10), default='false')
    ip_address = db.Column(db.String(50), nullable=True)  # Store actual IP address
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'streamer_uuid': self.streamer_uuid,
            'streamer_type': self.streamer_type,
            'streamer_hr_name': self.streamer_hr_name,
            'config_template_name': self.config_template_name,
            'is_alive': self.is_alive,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ComputeUnit(db.Model):
    __tablename__ = 'compute_units'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), default='offline')  # online, offline
    last_seen = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'ipAddress': self.ip_address,
            'status': self.status,
            'lastSeen': self.last_seen.strftime('%Y-%m-%d %H:%M:%S') if self.last_seen else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

# Utility Functions
def get_system_stats():
    """Get current system statistics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get CPU temperature (Raspberry Pi specific)
        temperature = 0.0
        try:
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temperature = float(f.read().strip()) / 1000.0
        except:
            # Fallback for non-Raspberry Pi systems
            try:
                import subprocess
                result = subprocess.run(['vcgencmd', 'measure_temp'], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    temp_str = result.stdout.strip().replace('temp=', '').replace("'C", '')
                    temperature = float(temp_str)
            except:
                temperature = 45.0  # Default temperature for demo
        
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_string = format_uptime(uptime_seconds)
        
        return {
            'cpu_usage': round(float(cpu_percent), 1),
            'memory_usage': round(float(memory.percent), 1),
            'memory_total': memory.total,
            'memory_used': memory.used,
            'disk_usage': round((disk.used / disk.total) * 100, 1),
            'disk_total': disk.total,
            'disk_used': disk.used,
            'disk_free': disk.free,
            'temperature': round(float(temperature), 1),
            'uptime': uptime_string,
            'uptime_seconds': int(uptime_seconds)
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {
            'cpu_usage': 0.0,
            'memory_usage': 0.0,
            'memory_total': 0,
            'memory_used': 0,
            'disk_usage': 0.0,
            'disk_total': 0,
            'disk_used': 0,
            'disk_free': 0,
            'temperature': 0.0,
            'uptime': '0d 0h 0m',
            'uptime_seconds': 0
        }

def format_uptime(seconds):
    """Format uptime seconds to human readable string"""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    return f"{days}d {hours}h {minutes}m"

def ping_device_detailed(ip_address: str, via_ai_system: str = None) -> dict:
    """Ping a device directly to check if it responds with 'pong' from its own AI system"""
    result = {
        'reachable': False,
        'response': 'No response',
        'method': 'unknown'
    }
    
    try:
        # Ping the device directly at its own AI system endpoint
        if ':' in ip_address:
            # IP already includes port
            ping_url = f"http://{ip_address}/ping"
        else:
            # Add default AI system port
            ping_url = f"http://{ip_address}:8000/ping"
        
        logger.info(f"Pinging device directly at: {ping_url}")
        response = requests.get(ping_url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            result['method'] = 'direct_ai_ping'
            result['response'] = data.get('msg', data.get('status', 'Unknown'))
            # Only accept explicit "pong" response
            result['reachable'] = data.get('msg') == 'pong'
            logger.info(f"Device {ip_address} responded with: {result['response']}")
            return result
        else:
            result['method'] = 'direct_ai_ping'
            result['response'] = f"Device not found (HTTP {response.status_code})"
            result['reachable'] = False
            return result
            
    except requests.exceptions.ConnectionError:
        logger.warning(f"Connection refused to device {ip_address}")
        result['response'] = "Device not found - connection refused"
        result['method'] = 'connection_refused'
        result['reachable'] = False
        return result
    except requests.exceptions.Timeout:
        logger.warning(f"Timeout connecting to device {ip_address}")
        result['response'] = "Device not found - connection timeout"
        result['method'] = 'connection_timeout'
        result['reachable'] = False
        return result
    except Exception as e:
        logger.warning(f"Failed to ping device {ip_address}: {e}")
        result['response'] = "Device not found - unable to connect"
        result['method'] = 'connection_failed'
        result['reachable'] = False
        return result

def ping_device(ip_address: str, via_ai_system: str = None) -> bool:
    """Ping a device to check if it's online via AI system or direct ping"""
    result = ping_device_detailed(ip_address, via_ai_system)
    return result['reachable']

def get_device_stats(ip_address: str) -> Optional[Dict]:
    """Get system stats from a remote Raspberry Pi device"""
    try:
        # This would be an API call to the remote device
        # For now, we'll simulate with mock data based on ping status
        if ping_device(ip_address):
            import random
            return {
                'cpu_usage': round(random.uniform(20, 80), 1),
                'memory_usage': round(random.uniform(40, 90), 1),
                'disk_usage': round(random.uniform(30, 95), 1),
                'temperature': round(random.uniform(40, 70), 1),
                'uptime': f"{random.randint(0, 30)}d {random.randint(0, 23)}h {random.randint(0, 59)}m"
            }
        return None
    except Exception as e:
        logger.error(f"Error getting device stats for {ip_address}: {e}")
        return None

# API Resources
class AuthCheckResource(Resource):
    def get(self):
        """Check if admin user is registered"""
        user_count = User.query.count()
        return {
            'isRegistered': user_count > 0,
            'userCount': user_count
        }

class RegisterResource(Resource):
    def post(self):
        """Register the admin user (only if no users exist)"""
        try:
            # Check if any users already exist
            if User.query.count() > 0:
                return {'message': 'Admin user already exists'}, 400
            
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['name', 'username', 'password']
            for field in required_fields:
                if not data.get(field):
                    return {'message': f'{field} is required'}, 400
            
            # Validate username format
            username = data['username'].strip().lower()
            if len(username) < 3:
                return {'message': 'Username must be at least 3 characters long'}, 400
            
            # Validate password
            if len(data['password']) < 6:
                return {'message': 'Password must be at least 6 characters long'}, 400
            
            # Create admin user
            user = User()
            user.name = data['name'].strip()
            user.username = username
            user.role = 'admin'
            user.set_password(data['password'])
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"Admin user registered: {username}")
            return {'message': 'Admin user registered successfully'}, 201
            
        except Exception as e:
            logger.error(f"Registration error: {e}")
            db.session.rollback()
            return {'message': 'Registration failed'}, 500

class LoginResource(Resource):
    def post(self):
        """Login user and return JWT token"""
        try:
            data = request.get_json()
            
            username = data.get('username', '').strip().lower()
            password = data.get('password', '')
            
            if not username or not password:
                return {'message': 'Username and password are required'}, 400
            
            user = User.query.filter_by(username=username).first()
            
            if not user or not user.check_password(password):
                return {'message': 'Invalid username or password'}, 401
            
            if not user.is_active:
                return {'message': 'Account is disabled'}, 401
            
            # Update last login
            user.last_login = datetime.datetime.utcnow()
            db.session.commit()
            
            # Create access token
            access_token = create_access_token(identity=user.id)
            
            logger.info(f"User logged in: {username}")
            return {
                'access_token': access_token,
                'user': user.to_dict()
            }, 200
            
        except Exception as e:
            logger.error(f"Login error: {e}")
            return {'message': 'Login failed'}, 500

class SystemStatsResource(Resource):
    @jwt_required()
    def get(self):
        """Get current system statistics"""
        try:
            stats = get_system_stats()
            return stats, 200
        except Exception as e:
            logger.error(f"Error getting system stats: {e}")
            return {'message': 'Failed to get system stats'}, 500

class RaspberryDevicesResource(Resource):
    @jwt_required()
    def get(self):
        """Get all Raspberry Pi devices"""
        try:
            devices = RaspberryDevice.query.all()
            return [device.to_dict() for device in devices], 200
        except Exception as e:
            logger.error(f"Error getting devices: {e}")
            return {'message': 'Failed to get devices'}, 500
    
    @jwt_required()
    def post(self):
        """Add a new Raspberry Pi device"""
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('name') or not data.get('ip_address'):
                return {'message': 'Name and IP address are required'}, 400
            
            # Check if IP already exists
            existing_device = RaspberryDevice.query.filter_by(
                ip_address=data['ip_address']
            ).first()
            
            if existing_device:
                return {'message': 'Device with this IP address already exists'}, 400
            
            # Create new device
            device = RaspberryDevice()
            device.name = data['name']
            device.ip_address = data['ip_address']
            
            # Try to ping the device to set initial status
            if ping_device(data['ip_address']):
                device.status = 'online'
                # Try to get initial stats
                stats = get_device_stats(data['ip_address'])
                if stats:
                    device.cpu_usage = stats['cpu_usage']
                    device.memory_usage = stats['memory_usage']
                    device.disk_usage = stats['disk_usage']
                    device.temperature = stats['temperature']
                    device.uptime = stats['uptime']
            
            db.session.add(device)
            db.session.commit()
            
            logger.info(f"Device added: {data['name']} ({data['ip_address']})")
            return device.to_dict(), 201
            
        except Exception as e:
            logger.error(f"Error adding device: {e}")
            db.session.rollback()
            return {'message': 'Failed to add device'}, 500

class RaspberryDeviceResource(Resource):
    @jwt_required()
    def get(self, device_id):
        """Get specific device details"""
        try:
            device = RaspberryDevice.query.get_or_404(device_id)
            return device.to_dict(), 200
        except Exception as e:
            logger.error(f"Error getting device {device_id}: {e}")
            return {'message': 'Device not found'}, 404
    
    @jwt_required()
    def put(self, device_id):
        """Update device information"""
        try:
            device = RaspberryDevice.query.get_or_404(device_id)
            data = request.get_json()
            
            if 'name' in data:
                device.name = data['name']
            
            if 'ip_address' in data and data['ip_address'] != device.ip_address:
                # Check if new IP already exists
                existing = RaspberryDevice.query.filter_by(
                    ip_address=data['ip_address']
                ).first()
                if existing and existing.id != device.id:
                    return {'message': 'Device with this IP address already exists'}, 400
                device.ip_address = data['ip_address']
            
            db.session.commit()
            logger.info(f"Device updated: {device.name}")
            return device.to_dict(), 200
            
        except Exception as e:
            logger.error(f"Error updating device {device_id}: {e}")
            db.session.rollback()
            return {'message': 'Failed to update device'}, 500
    
    @jwt_required()
    def delete(self, device_id):
        """Delete a device"""
        try:
            device = RaspberryDevice.query.get_or_404(device_id)
            device_name = device.name
            
            db.session.delete(device)
            db.session.commit()
            
            logger.info(f"Device deleted: {device_name}")
            return {'message': 'Device deleted successfully'}, 200
            
        except Exception as e:
            logger.error(f"Error deleting device {device_id}: {e}")
            db.session.rollback()
            return {'message': 'Failed to delete device'}, 500

class RefreshDevicesResource(Resource):
    @jwt_required()
    def post(self):
        """Refresh all device statuses and stats"""
        try:
            devices = RaspberryDevice.query.all()
            updated_devices = []
            
            for device in devices:
                # Check if device is online
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
                
                updated_devices.append(device.to_dict())
            
            db.session.commit()
            logger.info(f"Refreshed {len(devices)} devices")
            return {'devices': updated_devices}, 200
            
        except Exception as e:
            logger.error(f"Error refreshing devices: {e}")
            db.session.rollback()
            return {'message': 'Failed to refresh devices'}, 500

# Ping Resource for REST API compatibility
class PingResource(Resource):
    def get(self):
        """Handle ping requests through REST API - proxy to AI system"""
        try:
            ip = request.args.get('ip')
            via_ai_system = request.args.get('via_ai_system')  # Optional AI system IP
            
            if ip:
                # Use the detailed ping function to get full response
                ping_result = ping_device_detailed(ip, via_ai_system)
                return {
                    'status': 'reachable' if ping_result['reachable'] else 'unreachable',
                    'ip': ip,
                    'msg': ping_result['response'],
                    'method': ping_result['method']
                }, 200
            else:
                # Just return API status
                return {'status': 'online', 'message': 'Flask API is reachable'}, 200
        except Exception as e:
            logger.error(f"Error in ping resource: {e}")
            return {'status': 'error', 'message': str(e)}, 500
    
    def options(self):
        """Handle CORS preflight for ping endpoint"""
        return {}, 200

# Compute Units Resource for managing compute units
class ComputeUnitsResource(Resource):
    def get(self):
        """Get all compute units"""
        try:
            compute_units = ComputeUnit.query.all()
            result = [unit.to_dict() for unit in compute_units]
            logger.info(f"Retrieved {len(result)} compute units")
            return {'compute_units': result}, 200
        except Exception as e:
            logger.error(f"Error retrieving compute units: {e}")
            return {'message': 'Failed to retrieve compute units'}, 500
    
    def post(self):
        """Add a new compute unit"""
        try:
            data = request.get_json()
            if not data or 'ip_address' not in data:
                return {'message': 'IP address is required'}, 400
            
            ip_address = data['ip_address'].strip()
            name = data.get('name', f'Compute Unit {ip_address}')
            
            # Check if compute unit already exists
            existing_unit = ComputeUnit.query.filter_by(ip_address=ip_address).first()
            if existing_unit:
                return {'message': 'Compute unit with this IP already exists'}, 409
            
            # Ping the compute unit to verify it's reachable using the detailed ping function
            ping_result = ping_device_detailed(ip_address)
            
            if not ping_result['reachable']:
                logger.warning(f"Compute unit at {ip_address} ping failed: {ping_result['response']}")
                return {'message': f'Compute unit is not reachable: {ping_result["response"]}'}, 400
            
            logger.info(f"Compute unit at {ip_address} responded successfully: {ping_result['response']}")
            
            # Create new compute unit
            new_unit = ComputeUnit(
                name=name,
                ip_address=ip_address,
                status='online',
                last_seen=datetime.datetime.utcnow()
            )
            
            db.session.add(new_unit)
            db.session.commit()
            
            logger.info(f"Added new compute unit: {name} ({ip_address})")
            return {'compute_unit': new_unit.to_dict()}, 201
            
        except Exception as e:
            logger.error(f"Error adding compute unit: {e}")
            db.session.rollback()
            return {'message': 'Failed to add compute unit'}, 500
    
    def options(self):
        """Handle CORS preflight for compute units endpoint"""
        return {}, 200

class ComputeUnitResource(Resource):
    def delete(self, unit_id):
        """Delete a compute unit"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            ip_address = compute_unit.ip_address
            db.session.delete(compute_unit)
            db.session.commit()
            
            logger.info(f"Deleted compute unit: {ip_address}")
            return {'message': 'Compute unit deleted successfully'}, 200
            
        except Exception as e:
            logger.error(f"Error deleting compute unit: {e}")
            db.session.rollback()
            return {'message': 'Failed to delete compute unit'}, 500
    
    def put(self, unit_id):
        """Update compute unit status"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            data = request.get_json()
            if data:
                if 'status' in data:
                    compute_unit.status = data['status']
                if 'name' in data:
                    compute_unit.name = data['name']
                
                compute_unit.updated_at = datetime.datetime.utcnow()
                if data.get('status') == 'online':
                    compute_unit.last_seen = datetime.datetime.utcnow()
                
                db.session.commit()
                
            return {'compute_unit': compute_unit.to_dict()}, 200
            
        except Exception as e:
            logger.error(f"Error updating compute unit: {e}")
            db.session.rollback()
            return {'message': 'Failed to update compute unit'}, 500
    
    def options(self, unit_id):
        """Handle CORS preflight for compute unit endpoint"""
        return {}, 200

# Streamers Resource for device management
class StreamersResource(Resource):
    def get(self):
        """Get all streamers/devices"""
        try:
            streamers = Streamer.query.all()
            result = []
            for streamer in streamers:
                result.append({
                    'id': streamer.id,
                    'streamer_uuid': streamer.streamer_uuid,
                    'streamer_type': streamer.streamer_type,
                    'streamer_hr_name': streamer.streamer_hr_name,
                    'config_template_name': streamer.config_template_name,
                    'is_alive': streamer.is_alive,
                    'ip_address': streamer.ip_address,
                    'created_at': streamer.created_at.isoformat() if streamer.created_at else None,
                    'updated_at': streamer.updated_at.isoformat() if streamer.updated_at else None
                })
            return result, 200
        except Exception as e:
            logger.error(f"Error getting streamers: {e}")
            return {'message': 'Failed to get streamers'}, 500
    
    def post(self):
        """Add a new streamer/device"""
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['streamer_uuid', 'streamer_type', 'streamer_hr_name', 'config_template_name', 'is_alive']
            if not all(field in data for field in required_fields):
                return {'message': 'Missing required fields'}, 400
            
            # Create new streamer
            streamer = Streamer(
                streamer_uuid=data['streamer_uuid'],
                streamer_type=data['streamer_type'],
                streamer_hr_name=data['streamer_hr_name'],
                config_template_name=data['config_template_name'],
                is_alive=data['is_alive'],
                ip_address=data.get('ip_address')  # Store IP address if provided
            )
            
            db.session.add(streamer)
            db.session.commit()
            
            return {
                'message': 'Streamer added successfully',
                'id': streamer.id
            }, 201
            
        except Exception as e:
            logger.error(f"Error adding streamer: {e}")
            db.session.rollback()
            return {'message': 'Failed to add streamer'}, 500
    
    def put(self):
        """Update streamer status (for ping updates)"""
        try:
            data = request.get_json()
            streamer_id = data.get('id')
            
            if not streamer_id:
                return {'message': 'Streamer ID is required'}, 400
            
            streamer = Streamer.query.get(streamer_id)
            if not streamer:
                return {'message': 'Streamer not found'}, 404
            
            # Update status based on ping result
            if 'is_alive' in data:
                streamer.is_alive = data['is_alive']
                streamer.updated_at = datetime.datetime.utcnow()
                
            db.session.commit()
            
            return {
                'message': 'Streamer status updated successfully',
                'id': streamer.id,
                'is_alive': streamer.is_alive
            }, 200
            
        except Exception as e:
            logger.error(f"Error updating streamer status: {e}")
            db.session.rollback()
            return {'message': 'Failed to update streamer status'}, 500
    
    def options(self):
        """Handle CORS preflight for streamers endpoint"""
        return {}, 200

# Cameras Resource - proxy to main AI system
class CamerasResource(Resource):
    def get(self):
        """Get cameras/streamers from specific Compute Unit via proxy"""
        try:
            # Get Compute Unit IP from query parameter
            compute_unit_ip = request.args.get('compute_unit_ip')
            
            if compute_unit_ip:
                # Fetch from specific Compute Unit's AI system using new endpoint
                # Check if port is already included in the IP
                if ':' in compute_unit_ip:
                    ai_url = f"http://{compute_unit_ip}/streamers/public/get_streamers_infos"
                else:
                    ai_url = f"http://{compute_unit_ip}:8000/streamers/public/get_streamers_infos"
                    
                logger.info(f"Fetching streamers from: {ai_url}")
                try:
                    response = requests.get(ai_url, timeout=10)
                    if response.status_code == 200:
                        ai_data = response.json()
                        # Add Compute Unit IP to each streamer for identification
                        if ai_data.get('payload'):
                            for streamer in ai_data['payload']:
                                streamer['compute_unit_ip'] = compute_unit_ip
                        logger.info(f"Successfully fetched {len(ai_data.get('payload', []))} streamers from {compute_unit_ip}")
                        return ai_data, 200
                    else:
                        logger.warning(f"AI system at {compute_unit_ip} returned status {response.status_code}")
                        return {'payload': []}, 200
                except requests.exceptions.RequestException as e:
                    logger.warning(f"Cannot connect to AI system at {compute_unit_ip}: {e}")
                    return {'payload': []}, 200
            else:
                # No Compute Unit IP provided - return empty payload
                # This prevents loading cameras when no Compute Units exist
                logger.info("No Compute Unit IP provided, returning empty camera list")
                return {'payload': []}, 200
        except Exception as e:
            logger.error(f"Error in cameras resource: {e}")
            return {'payload': []}, 200
    
    def options(self):
        """Handle CORS preflight for cameras endpoint"""
        return {}, 200

# Streamer Status Resource - check live camera statuses
class StreamerStatusResource(Resource):
    def get(self):
        """Get live camera statuses from specific IO Unit via /get-streamers"""
        try:
            # Get IO Unit IP from query parameter
            io_unit_ip = request.args.get('io_unit_ip')
            
            if not io_unit_ip:
                return {'message': 'IO Unit IP is required'}, 400
                
            # Fetch from specific IO Unit's AI system
            # Check if port is already included in the IP
            if ':' in io_unit_ip:
                ai_url = f"http://{io_unit_ip}/get_streamers"
            else:
                ai_url = f"http://{io_unit_ip}:8000/get_streamers"
                
            try:
                response = requests.get(ai_url, timeout=10)
                if response.status_code == 200:
                    ai_data = response.json()
                    # Extract only the status information we need
                    camera_statuses = []
                    if ai_data.get('payload'):
                        for camera in ai_data['payload']:
                            if camera.get('streamer_type') == 'camera':
                                camera_statuses.append({
                                    'streamer_uuid': camera.get('streamer_uuid'),
                                    'streamer_hr_name': camera.get('streamer_hr_name'),
                                    'is_alive': camera.get('is_alive', 'false'),
                                    'io_unit_ip': io_unit_ip
                                })
                    return {
                        'success': True,
                        'io_unit_ip': io_unit_ip,
                        'cameras': camera_statuses
                    }, 200
                else:
                    logger.warning(f"AI system at {io_unit_ip} returned status {response.status_code}")
                    return {
                        'success': False,
                        'message': f'AI system responded with status {response.status_code}',
                        'io_unit_ip': io_unit_ip,
                        'cameras': []
                    }, 200
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Cannot connect to AI system at {io_unit_ip}: {e}")
                return {
                    'success': False,
                    'message': f'Cannot connect to AI system: {str(e)}',
                    'io_unit_ip': io_unit_ip,
                    'cameras': []
                }, 200
                
        except Exception as e:
            logger.error(f"Error in streamer status resource: {e}")
            return {
                'success': False,
                'message': f'Internal error: {str(e)}',
                'cameras': []
            }, 500
    
    def options(self):
        """Handle CORS preflight for streamer status endpoint"""
        return {}, 200

# Supported Apps Resource - fetch supported apps from AI backend
class SupportedAppsResource(Resource):
    def get(self):
        """Get supported apps for a specific compute unit from AI backend"""
        try:
            # Get Compute Unit IP from query parameter
            compute_unit_ip = request.args.get('compute_unit_ip')
            
            if not compute_unit_ip:
                return {'message': 'Compute Unit IP is required'}, 400
                
            # Fetch from specific Compute Unit's AI system
            # Check if port is already included in the IP
            if ':' in compute_unit_ip:
                ai_url = f"http://{compute_unit_ip}/apps/device_dependent_info/supported_apps"
            else:
                ai_url = f"http://{compute_unit_ip}:8000/apps/device_dependent_info/supported_apps"
                
            try:
                logger.info(f"Fetching supported apps from: {ai_url}")
                response = requests.get(ai_url, timeout=10)
                
                if response.status_code == 200:
                    ai_data = response.json()
                    logger.info(f"Successfully fetched supported apps from {compute_unit_ip}")
                    return ai_data, 200
                else:
                    logger.warning(f"AI system at {compute_unit_ip} returned status {response.status_code}")
                    return {
                        'message': f'AI system returned HTTP {response.status_code}',
                        'supported_apps': []
                    }, 200
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Cannot connect to AI system at {compute_unit_ip}: {e}")
                return {
                    'message': f'Cannot connect to AI system: {str(e)}',
                    'supported_apps': []
                }, 200
                
        except Exception as e:
            logger.error(f"Error in supported apps resource: {e}")
            return {
                'message': 'Failed to fetch supported apps',
                'supported_apps': []
            }, 500
    
    def options(self):
        """Handle CORS preflight for supported apps endpoint"""
        return {}, 200

# App Assignment Management Resources
class StreamerAppAssignmentsResource(Resource):
    def get(self):
        """Get app assignments for a specific streamer from AI backend"""
        try:
            # Get parameters
            compute_unit_ip = request.args.get('compute_unit_ip')
            streamer_uuid = request.args.get('streamer_uuid')
            
            if not compute_unit_ip:
                return {'message': 'Compute Unit IP is required'}, 400
                
            # Fetch from specific Compute Unit's AI system
            if ':' in compute_unit_ip:
                ai_url = f"http://{compute_unit_ip}/apps/public/get_streamer_app_assignments"
            else:
                ai_url = f"http://{compute_unit_ip}:8000/apps/public/get_streamer_app_assignments"
                
            # Add streamer_uuid as query parameter if provided
            if streamer_uuid:
                ai_url += f"?streamer_uuid={streamer_uuid}"
                
            try:
                logger.info(f"Fetching app assignments from: {ai_url}")
                response = requests.get(ai_url, timeout=10)
                
                if response.status_code == 200:
                    ai_data = response.json()
                    logger.info(f"Successfully fetched app assignments from {compute_unit_ip}")
                    return ai_data, 200
                else:
                    logger.warning(f"AI system at {compute_unit_ip} returned status {response.status_code}")
                    return {
                        'message': f'AI system returned HTTP {response.status_code}',
                        'assignments': []
                    }, 200
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Cannot connect to AI system at {compute_unit_ip}: {e}")
                return {
                    'message': f'Cannot connect to AI system: {str(e)}',
                    'assignments': []
                }, 200
                
        except Exception as e:
            logger.error(f"Error in app assignments resource: {e}")
            return {
                'message': 'Failed to fetch app assignments',
                'assignments': []
            }, 500
    
    def options(self):
        """Handle CORS preflight for app assignments endpoint"""
        return {}, 200

class StreamerAppAssignmentUpdateResource(Resource):
    def put(self):
        """Update/Create app assignment for a streamer via AI backend"""
        try:
            # Get parameters
            compute_unit_ip = request.args.get('compute_unit_ip')
            data = request.get_json()
            
            if not compute_unit_ip:
                return {'message': 'Compute Unit IP is required'}, 400
                
            if not data:
                return {'message': 'Request body is required'}, 400
                
            # Fetch from specific Compute Unit's AI system
            if ':' in compute_unit_ip:
                ai_url = f"http://{compute_unit_ip}/apps/public/update_streamer_app_assignment"
            else:
                ai_url = f"http://{compute_unit_ip}:8000/apps/public/update_streamer_app_assignment"
                
            try:
                logger.info(f"Updating app assignment at: {ai_url}")
                response = requests.put(ai_url, json=data, timeout=10)
                
                if response.status_code == 200:
                    ai_data = response.json()
                    logger.info(f"Successfully updated app assignment at {compute_unit_ip}")
                    return ai_data, 200
                else:
                    logger.warning(f"AI system at {compute_unit_ip} returned status {response.status_code}")
                    return {
                        'message': f'AI system returned HTTP {response.status_code}',
                        'success': False
                    }, response.status_code
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Cannot connect to AI system at {compute_unit_ip}: {e}")
                return {
                    'message': f'Cannot connect to AI system: {str(e)}',
                    'success': False
                }, 500
                
        except Exception as e:
            logger.error(f"Error in app assignment update resource: {e}")
            return {
                'message': 'Failed to update app assignment',
                'success': False
            }, 500
    
    def options(self):
        """Handle CORS preflight for app assignment update endpoint"""
        return {}, 200

class StreamerAppAssignmentDeleteResource(Resource):
    def delete(self):
        """Delete app assignment for a streamer via AI backend"""
        try:
            # Get parameters
            compute_unit_ip = request.args.get('compute_unit_ip')
            data = request.get_json()
            
            if not compute_unit_ip:
                return {'message': 'Compute Unit IP is required'}, 400
                
            if not data or 'assignment_uuid' not in data:
                return {'message': 'assignment_uuid is required in request body'}, 400
                
            # Fetch from specific Compute Unit's AI system
            if ':' in compute_unit_ip:
                ai_url = f"http://{compute_unit_ip}/apps/public/delete_streamer_app_assignment"
            else:
                ai_url = f"http://{compute_unit_ip}:8000/apps/public/delete_streamer_app_assignment"
                
            try:
                logger.info(f"Deleting app assignment at: {ai_url}")
                response = requests.delete(ai_url, json=data, timeout=10)
                
                if response.status_code == 200:
                    ai_data = response.json()
                    logger.info(f"Successfully deleted app assignment at {compute_unit_ip}")
                    return ai_data, 200
                else:
                    logger.warning(f"AI system at {compute_unit_ip} returned status {response.status_code}")
                    return {
                        'message': f'AI system returned HTTP {response.status_code}',
                        'success': False
                    }, response.status_code
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Cannot connect to AI system at {compute_unit_ip}: {e}")
                return {
                    'message': f'Cannot connect to AI system: {str(e)}',
                    'success': False
                }, 500
                
        except Exception as e:
            logger.error(f"Error in app assignment delete resource: {e}")
            return {
                'message': 'Failed to delete app assignment',
                'success': False
            }, 500
    
    def options(self):
        """Handle CORS preflight for app assignment delete endpoint"""
        return {}, 200

# Register API endpoints
api.add_resource(AuthCheckResource, '/api/auth/check-registration')
api.add_resource(RegisterResource, '/api/auth/register')
api.add_resource(LoginResource, '/api/auth/login')
api.add_resource(SystemStatsResource, '/api/system/stats')
api.add_resource(RaspberryDevicesResource, '/api/devices')
api.add_resource(RaspberryDeviceResource, '/api/devices/<int:device_id>')
api.add_resource(RefreshDevicesResource, '/api/devices/refresh')
# New Streamer API endpoints
api.add_resource(PingResource, '/api/ping')
api.add_resource(StreamersResource, '/get_streamers')
api.add_resource(StreamersResource, '/add_streamer', endpoint='add_streamer')
api.add_resource(CamerasResource, '/get_cameras')
api.add_resource(StreamerStatusResource, '/get_streamer_statuses')
api.add_resource(ComputeUnitsResource, '/api/compute_units')
api.add_resource(ComputeUnitResource, '/api/compute_units/<int:unit_id>')
api.add_resource(SupportedAppsResource, '/api/apps/supported')
api.add_resource(StreamerAppAssignmentsResource, '/api/apps/assignments')
api.add_resource(StreamerAppAssignmentUpdateResource, '/api/apps/assignments/update')
api.add_resource(StreamerAppAssignmentDeleteResource, '/api/apps/assignments/delete')

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

# Background task to monitor devices
def monitor_devices():
    """Background task to monitor device status"""
    while True:
        try:
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

# Initialize database
def create_tables():
    with app.app_context():
        db.create_all()
        logger.info("Database tables created")

# Health check endpoint
@app.route('/api/health')
def health_check():
    return {'status': 'healthy', 'timestamp': datetime.datetime.utcnow().isoformat()}

if __name__ == '__main__':
    # Create tables
    create_tables()
    
    # Start device monitoring in background
    monitor_thread = threading.Thread(target=monitor_devices, daemon=True)
    monitor_thread.start()
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=8001)
