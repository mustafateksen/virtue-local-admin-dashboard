"""
Streamers API endpoints.
Handles streamer operations and proxy requests to AI systems.
"""
from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
import datetime
import requests
import logging
import json

from models import db, Streamer, FavoriteStreamer
from config import Config

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for streamers API
streamers_bp = Blueprint('streamers', __name__, url_prefix='/api/streamers')
streamers_api = Api(streamers_bp)


class StreamersProxyResource(Resource):
    def get(self):
        """Proxy request to AI service to get streamers info"""
        try:
            compute_unit_ip = request.args.get('compute_unit_ip')
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip parameter is required'}, 400
            
            # Make request to AI service
            ai_service_url = f"http://{compute_unit_ip}/streamers/public/get_streamers_infos"
            logger.info(f"Proxying request to: {ai_service_url}")
            
            response = requests.get(ai_service_url, timeout=10)
            response.raise_for_status()
            
            # Return the AI service response
            return response.json(), 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying request to AI service {compute_unit_ip}: {e}")
            return {'message': f'Failed to connect to AI service at {compute_unit_ip}'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in proxy request: {e}")
            return {'message': 'Internal server error'}, 500


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


# Register resources with the API
streamers_api.add_resource(StreamersProxyResource, '/proxy')
streamers_api.add_resource(StreamersResource, '/get_streamers')
streamers_api.add_resource(StreamersResource, '/add_streamer', endpoint='add_streamer')


# Additional Flask routes for streamers API
@streamers_bp.route('/last_frame', methods=['POST'])
def get_last_frame():
    """Get last frame from a streamer via AI service"""
    data = request.get_json()
    streamer_uuid = data.get('streamer_uuid')
    compute_unit_ip = data.get('compute_unit_ip')
    
    if not streamer_uuid:
        return jsonify({"error": "streamer_uuid is required"}), 400
        
    try:
        # Use provided compute_unit_ip or find from favorites table
        if not compute_unit_ip:
            favorite_streamer = FavoriteStreamer.query.filter_by(streamer_uuid=streamer_uuid).first()
            if not favorite_streamer:
                logger.error(f"Streamer {streamer_uuid} not found in favorites and no compute_unit_ip provided")
                return jsonify({"error": "Streamer not found in favorites and no compute_unit_ip provided"}), 404
            compute_unit_ip = favorite_streamer.compute_unit_ip
        
        # Build the correct endpoint URL using the compute unit's IP
        if ':' in compute_unit_ip:
            ai_service_endpoint = f"http://{compute_unit_ip}/streamers/public/get_streamer_last_frame"
        else:
            ai_service_endpoint = f"http://{compute_unit_ip}:8000/streamers/public/get_streamer_last_frame"
        
        logger.info(f"Fetching last frame for {streamer_uuid} from {ai_service_endpoint}")
        
        # Make a POST request to the AI service with the correct payload
        response = requests.post(ai_service_endpoint, json={"streamer_uuid": streamer_uuid}, timeout=10)
        response.raise_for_status()
        
        # Forward the JSON response from the AI service
        return jsonify(response.json())

    except requests.exceptions.Timeout:
        logger.error(f"Timeout connecting to compute unit {compute_unit_ip} for last_frame of {streamer_uuid}")
        return jsonify({"error": "Compute unit timed out"}), 504
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error to compute unit {compute_unit_ip} for last_frame of {streamer_uuid}")
        return jsonify({"error": "Could not connect to compute unit"}), 503
    except requests.exceptions.RequestException as e:
        logger.error(f"Error proxying last_frame request for {streamer_uuid} to compute unit {compute_unit_ip}: {e}")
        # Try to return the error from the AI service response if possible
        error_body = {"error": "Failed to get last frame from compute unit"}
        status_code = 502
        if e.response is not None:
            try:
                error_body = e.response.json()
                status_code = e.response.status_code
            except json.JSONDecodeError:
                error_body = {"error": e.response.text}
        return jsonify(error_body), status_code
    except Exception as e:
        logger.error(f"An unexpected error occurred in get_last_frame for {streamer_uuid}: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


@streamers_bp.route('/api/streamers', methods=['GET'])
def get_all_streamers():
    """Get all streamers from the database"""
    try:
        streamers = Streamer.query.all()
        return jsonify({
            'streamers': [streamer.to_dict() for streamer in streamers]
        }), 200
    except Exception as e:
        logger.error(f"Error getting all streamers: {e}")
        return jsonify({'error': 'Failed to get streamers'}), 500


@streamers_bp.route('/api/streamers/configs', methods=['GET'])
def get_streamer_configs():
    """Get streamer configurations from AI service"""
    streamer_uuid = request.args.get('streamer_uuid')
    if not streamer_uuid:
        return jsonify({"error": "streamer_uuid is required"}), 400
        
    try:
        # Get AI service URL from config
        AI_SERVICE_URL = Config.AI_SERVICE_URL
        
        # The endpoint on the actual AI service
        ai_service_endpoint = f"{AI_SERVICE_URL}/streamers/configs"
        
        params = {'streamer_uuid': streamer_uuid}
        
        # Make a GET request to the AI service
        response = requests.get(ai_service_endpoint, params=params)
        response.raise_for_status() # Raise an exception for bad status codes
        
        # Forward the JSON response
        return jsonify(response.json())

    except requests.exceptions.RequestException as e:
        logger.error(f"Error proxying request to AI service for streamer configs: {e}")
        error_body = e.response.json() if e.response else {"error": "Failed to connect to AI service for streamer configs"}
        status_code = e.response.status_code if e.response else 503
        return jsonify(error_body), status_code
    except Exception as e:
        logger.error(f"An unexpected error occurred in get_streamer_configs: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


@streamers_bp.route('/update_name', methods=['PUT'])
def update_streamer_name():
    """Update streamer name by proxying to the AI service"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Required fields
        required_fields = ['compute_unit_ip', 'streamer_uuid', 'streamer_type_uuid', 'streamer_hr_name', 'config_template_name', 'is_alive']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        compute_unit_ip = data['compute_unit_ip']
        
        # Prepare data for AI service
        ai_service_data = {
            "manuel_timestamp": datetime.datetime.now().isoformat(),
            "streamer_uuid": data['streamer_uuid'],
            "streamer_type_uuid": data['streamer_type_uuid'],
            "streamer_hr_name": data['streamer_hr_name'],
            "config_template_name": data['config_template_name'],
            "is_alive": data['is_alive']
        }
        
        # Make request to AI service
        # Handle compute unit IP - remove port if it exists, then add :8000
        base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
        ai_service_endpoint = f"http://{base_ip}:8000/streamers/private/update_streamer_info"
        
        logger.info(f"Updating streamer name via AI service: {ai_service_endpoint}")
        logger.info(f"Request data: {ai_service_data}")
        
        response = requests.put(ai_service_endpoint, json=ai_service_data, timeout=10)
        response.raise_for_status()
        
        # Also update the streamer name in our local database
        try:
            streamer = Streamer.query.filter_by(streamer_uuid=data['streamer_uuid']).first()
            if streamer:
                streamer.streamer_hr_name = data['streamer_hr_name']
                db.session.commit()
                logger.info(f"Updated streamer name in local database: {data['streamer_hr_name']}")
            else:
                logger.warning(f"Streamer with UUID {data['streamer_uuid']} not found in local database")
        except Exception as db_error:
            logger.error(f"Failed to update streamer name in local database: {db_error}")
            # Don't fail the whole request if database update fails
        
        logger.info(f"Streamer name updated successfully: {data['streamer_hr_name']}")
        
        return jsonify({
            'message': 'Streamer name updated successfully',
            'streamer_uuid': data['streamer_uuid'],
            'new_name': data['streamer_hr_name']
        }), 200
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Failed to update streamer name via AI service: {e}"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 503
    except Exception as e:
        error_msg = f"Error updating streamer name: {e}"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 500


@streamers_bp.route('/<streamer_uuid>/name', methods=['PUT'])
def update_streamer_name_simple(streamer_uuid):
    """Simple endpoint to update streamer name in our database and sync to compute unit"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
            
        new_name = data['name']
        
        # Find the streamer in our database
        streamer = Streamer.query.filter_by(streamer_uuid=streamer_uuid).first()
        if not streamer:
            return jsonify({'error': 'Streamer not found'}), 404
            
        # Get the compute unit info
        compute_unit = streamer.compute_unit
        if not compute_unit:
            return jsonify({'error': 'Compute unit not found for this streamer'}), 404
            
        old_name = streamer.streamer_hr_name
        
        # Try to update the streamer name on the compute unit first
        try:
            if compute_unit.status == 'online':
                # Prepare data for AI service in the correct format
                ai_service_data = {
                    "manuel_timestamp": datetime.datetime.now().isoformat(),
                    "streamer_uuid": streamer_uuid,
                    "streamer_type_uuid": streamer.streamer_type_uuid or "camera",
                    "streamer_hr_name": new_name,
                    "config_template_name": streamer.config_template_name or "default",
                    "is_alive": "1" if streamer.is_alive == "1" else "0"
                }
                
                # Make request to AI service
                base_ip = compute_unit.ip_address.split(':')[0] if ':' in compute_unit.ip_address else compute_unit.ip_address
                ai_service_endpoint = f"http://{base_ip}:8000/streamers/private/update_streamer_info"
                
                logger.info(f"Updating streamer name via AI service: {ai_service_endpoint}")
                logger.info(f"Request data: {ai_service_data}")
                
                response = requests.put(ai_service_endpoint, json=ai_service_data, timeout=10)
                
                if response.ok:
                    logger.info(f"Successfully updated streamer name on compute unit: {old_name} -> {new_name}")
                else:
                    logger.warning(f"Failed to update streamer name on compute unit (status: {response.status_code}), but will update local database")
            else:
                logger.info(f"Compute unit is offline, updating only local database: {old_name} -> {new_name}")
                
        except Exception as sync_error:
            logger.warning(f"Failed to sync streamer name to compute unit: {sync_error}, but will update local database")
        
        # Update the streamer name in our local database
        streamer.streamer_hr_name = new_name
        db.session.commit()
        
        logger.info(f"Updated streamer name in database: {old_name} -> {new_name}")
        
        return jsonify({
            'message': 'Streamer name updated successfully',
            'streamer_uuid': streamer_uuid,
            'new_name': new_name,
            'old_name': old_name
        }), 200
        
    except Exception as e:
        error_msg = f"Error updating streamer name: {e}"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 500
