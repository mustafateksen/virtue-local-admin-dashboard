"""
Compute Units API endpoints.
Handles compute units CRUD operations and status management.
"""
from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
import datetime
import logging
import requests
import json

from models import db, ComputeUnit, Streamer
from utils.ping import ping_device_detailed

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for compute units API
compute_units_bp = Blueprint('compute_units', __name__)
compute_units_api = Api(compute_units_bp)


class ComputeUnitsResource(Resource):
    def get(self):
        """Get all compute units with their cameras"""
        try:
            compute_units = ComputeUnit.query.all()
            result = []
            
            for unit in compute_units:
                unit_dict = unit.to_dict(include_cameras=True)
                
                # If unit is online, try to sync cameras from live data
                if unit.status == 'online':
                    try:
                        self._sync_cameras_from_unit(unit)
                    except Exception as sync_error:
                        logger.warning(f"Failed to sync cameras for unit {unit.ip_address}: {sync_error}")
                        # Mark unit as offline if sync fails
                        unit.status = 'offline'
                        db.session.commit()
                        unit_dict['status'] = 'offline'
                
                # Get updated camera data from database after sync
                cameras = []
                streamers = Streamer.query.filter_by(compute_unit_id=unit.id, streamer_type='camera').all()
                for streamer in streamers:
                    camera_dict = streamer.to_dict()
                    # If compute unit is offline, mark all cameras as inactive
                    if unit.status == 'offline':
                        camera_dict['status'] = 'inactive'
                        camera_dict['is_alive'] = '0'
                    cameras.append(camera_dict)
                unit_dict['cameras'] = cameras
                
                result.append(unit_dict)
            
            logger.info(f"Retrieved {len(result)} compute units")
            return {'compute_units': result}, 200
        except Exception as e:
            logger.error(f"Error retrieving compute units: {e}")
            return {'message': 'Failed to retrieve compute units'}, 500
    
    def _sync_cameras_from_unit(self, unit):
        """Sync camera data from compute unit and store in database"""
        try:
            # Use the Flask proxy endpoint to get cameras
            proxy_url = f"http://localhost:8001/get_cameras?compute_unit_ip={unit.ip_address}"
            response = requests.get(proxy_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                cameras = data.get('payload', [])
                
                logger.info(f"Found {len(cameras)} cameras for unit {unit.ip_address}")
                
                # Also fetch app assignments to populate features
                assignments_data = self._fetch_app_assignments(unit.ip_address)
                
                # Update/create streamers in database
                for camera_data in cameras:
                    streamer_uuid = camera_data.get('streamer_uuid')
                    if not streamer_uuid:
                        continue
                    
                    # Find or create streamer
                    streamer = Streamer.query.filter_by(streamer_uuid=streamer_uuid).first()
                    if not streamer:
                        streamer = Streamer(
                            streamer_uuid=streamer_uuid,
                            streamer_type='camera',
                            streamer_hr_name=camera_data.get('streamer_hr_name', f'Camera {streamer_uuid}'),
                            config_template_name='default',
                            compute_unit_id=unit.id,
                            ip_address=unit.ip_address
                        )
                        db.session.add(streamer)
                        logger.info(f"Created new streamer: {streamer.streamer_hr_name}")
                    
                    # Update streamer info
                    streamer.streamer_hr_name = camera_data.get('streamer_hr_name', streamer.streamer_hr_name)
                    streamer.status = 'active' if camera_data.get('is_alive') == '1' else 'inactive'
                    streamer.is_alive = camera_data.get('is_alive', '0')
                    streamer.ip_address = unit.ip_address
                    streamer.compute_unit_id = unit.id
                    streamer.last_seen = datetime.datetime.utcnow()
                    
                    # Convert app assignments to features format for this streamer
                    features = self._convert_assignments_to_features(streamer_uuid, assignments_data)
                    streamer.features = json.dumps(features) if features else None
                
                # Mark unit as online
                unit.status = 'online'
                unit.last_seen = datetime.datetime.utcnow()
                
                db.session.commit()
                logger.info(f"Synced {len(cameras)} cameras for unit {unit.ip_address}")
                
        except Exception as e:
            logger.error(f"Error syncing cameras for unit {unit.ip_address}: {e}")
            raise
    
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
            
            # Try to sync cameras immediately after adding the unit
            try:
                self._sync_cameras_from_unit(new_unit)
                logger.info(f"Synced cameras for new unit: {name} ({ip_address})")
            except Exception as sync_error:
                logger.warning(f"Failed to sync cameras for new unit {ip_address}: {sync_error}")
            
            logger.info(f"Added new compute unit: {name} ({ip_address})")
            return {'compute_unit': new_unit.to_dict(include_cameras=True)}, 201
            
        except Exception as e:
            logger.error(f"Error adding compute unit: {e}")
            db.session.rollback()
            return {'message': 'Failed to add compute unit'}, 500
    
    def options(self):
        """Handle CORS preflight for compute units endpoint"""
        return {}, 200

    def _fetch_app_assignments(self, compute_unit_ip):
        """Fetch app assignments from compute unit"""
        try:
            # Check if port is already included in the IP
            if ':' in compute_unit_ip:
                ai_url = f"http://{compute_unit_ip}/apps/public/get_streamer_app_assignments"
            else:
                ai_url = f"http://{compute_unit_ip}:8000/apps/public/get_streamer_app_assignments"
            
            response = requests.get(ai_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('assignments', [])
            else:
                logger.warning(f"Failed to fetch app assignments from {compute_unit_ip}: HTTP {response.status_code}")
                return []
        except Exception as e:
            logger.warning(f"Error fetching app assignments from {compute_unit_ip}: {e}")
            return []
    
    def _convert_assignments_to_features(self, streamer_uuid, assignments_data):
        """Convert app assignments to features format (app_name.result_name)"""
        features = []
        
        for assignment in assignments_data:
            if (assignment.get('streamer_uuid') == streamer_uuid and 
                assignment.get('is_active') == 'true'):
                app_name = assignment.get('app_name', '')
                result_name = assignment.get('app_config_template_name', '')
                if app_name and result_name:
                    feature = f"{app_name}.{result_name}"
                    features.append(feature)
        
        logger.info(f"Converted {len(features)} assignments to features for streamer {streamer_uuid}: {features}")
        return features


class ComputeUnitStatusResource(Resource):
    def put(self, unit_id):
        """Update compute unit status only"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            data = request.get_json()
            if not data or 'status' not in data:
                return {'message': 'Status is required'}, 400
            
            old_status = compute_unit.status
            new_status = data['status']
            
            compute_unit.status = new_status
            compute_unit.updated_at = datetime.datetime.utcnow()
            
            if new_status == 'online':
                compute_unit.last_seen = datetime.datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"Updated compute unit {compute_unit.name} status: {old_status} -> {new_status}")
            return {'compute_unit': compute_unit.to_dict()}, 200
            
        except Exception as e:
            logger.error(f"Error updating compute unit status: {e}")
            db.session.rollback()
            return {'message': 'Failed to update compute unit status'}, 500
    
    def options(self, unit_id):
        """Handle CORS preflight for compute unit status endpoint"""
        return {}, 200


class ComputeUnitResource(Resource):
    def delete(self, unit_id):
        """Delete a compute unit and all associated streamers"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            ip_address = compute_unit.ip_address
            unit_name = compute_unit.name
            
            # First delete all associated streamers
            streamers = Streamer.query.filter_by(compute_unit_id=unit_id).all()
            streamer_count = len(streamers)
            
            for streamer in streamers:
                db.session.delete(streamer)
            
            # Then delete the compute unit
            db.session.delete(compute_unit)
            db.session.commit()
            
            logger.info(f"Deleted compute unit: {unit_name} ({ip_address}) and {streamer_count} associated streamers")
            return {
                'message': 'Compute unit deleted successfully',
                'deleted_streamers_count': streamer_count
            }, 200
            
        except Exception as e:
            logger.error(f"Error deleting compute unit: {e}")
            db.session.rollback()
            return {'message': 'Failed to delete compute unit'}, 500
    
    def put(self, unit_id):
        """Update compute unit name and/or status"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            data = request.get_json()
            if data:
                if 'status' in data:
                    compute_unit.status = data['status']
                if 'name' in data:
                    old_name = compute_unit.name
                    compute_unit.name = data['name']
                    logger.info(f"Updated compute unit name: {old_name} -> {compute_unit.name}")
                
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


class ComputeUnitCamerasResource(Resource):
    def get(self, unit_id):
        """Get all cameras for a specific compute unit"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            cameras = []
            streamers = Streamer.query.filter_by(compute_unit_id=unit_id, streamer_type='camera').all()
            for streamer in streamers:
                cameras.append(streamer.to_dict())
            
            return {'cameras': cameras}, 200
        except Exception as e:
            logger.error(f"Error retrieving cameras for unit {unit_id}: {e}")
            return {'message': 'Failed to retrieve cameras'}, 500
    
    def post(self, unit_id):
        """Sync cameras for a specific compute unit"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            resource = ComputeUnitsResource()
            resource._sync_cameras_from_unit(compute_unit)
            
            # Return updated cameras
            cameras = []
            streamers = Streamer.query.filter_by(compute_unit_id=unit_id, streamer_type='camera').all()
            for streamer in streamers:
                cameras.append(streamer.to_dict())
            
            return {'cameras': cameras, 'message': 'Cameras synced successfully'}, 200
        except Exception as e:
            logger.error(f"Error syncing cameras for unit {unit_id}: {e}")
            return {'message': 'Failed to sync cameras'}, 500


class StreamerResource(Resource):
    def put(self, streamer_uuid):
        """Update streamer name"""
        try:
            logger.info(f"🔧 Received PUT request for streamer: {streamer_uuid}")
            
            streamer = Streamer.query.filter_by(streamer_uuid=streamer_uuid).first()
            if not streamer:
                logger.warning(f"🔧 Streamer not found: {streamer_uuid}")
                return {'message': 'Streamer not found'}, 404
            
            data = request.get_json()
            logger.info(f"🔧 Request data: {data}")
            
            if not data or 'name' not in data:
                logger.warning(f"🔧 Invalid request data: {data}")
                return {'message': 'Name is required'}, 400
            
            old_name = streamer.streamer_hr_name
            new_name = data['name']
            
            logger.info(f"🔧 Updating streamer name: '{old_name}' -> '{new_name}'")
            
            streamer.streamer_hr_name = new_name
            streamer.updated_at = datetime.datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"✅ Successfully updated streamer name: {old_name} -> {streamer.streamer_hr_name}")
            return {'streamer': streamer.to_dict()}, 200
            
        except Exception as e:
            logger.error(f"Error updating streamer name: {e}")
            db.session.rollback()
            return {'message': 'Failed to update streamer name'}, 500


# Register the API resources
compute_units_api.add_resource(ComputeUnitsResource, '/api/compute_units')
compute_units_api.add_resource(ComputeUnitStatusResource, '/api/compute_units/<string:unit_id>/status')
compute_units_api.add_resource(ComputeUnitResource, '/api/compute_units/<string:unit_id>')
compute_units_api.add_resource(ComputeUnitCamerasResource, '/api/compute_units/<string:unit_id>/cameras')
compute_units_api.add_resource(StreamerResource, '/api/streamers/<string:streamer_uuid>')
