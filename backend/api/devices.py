"""
Device management API endpoints.
Handles Raspberry Pi devices CRUD operations and monitoring.
"""
from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
import datetime
import logging

from models import db, RaspberryDevice
from utils.ping import ping_device, ping_device_detailed
from utils.system_stats import get_device_stats

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for devices API
devices_bp = Blueprint('devices', __name__)
devices_api = Api(devices_bp)


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


class PingResource(Resource):
    def get(self):
        """Handle ping requests through REST API - proxy to AI system"""
        try:
            ip = request.args.get('ip')
            via_ai_system = request.args.get('via_ai_system')  # Optional AI system IP
            
            if ip:
                # Use the detailed ping function to get full response
                # Handle the optional via_ai_system parameter
                if via_ai_system:
                    ping_result = ping_device_detailed(ip, via_ai_system)
                else:
                    ping_result = ping_device_detailed(ip)
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


# Register resources with the API
devices_api.add_resource(RaspberryDevicesResource, '/api/devices')
devices_api.add_resource(RaspberryDeviceResource, '/api/devices/<int:device_id>')
devices_api.add_resource(RefreshDevicesResource, '/api/devices/refresh')
devices_api.add_resource(PingResource, '/api/ping')
