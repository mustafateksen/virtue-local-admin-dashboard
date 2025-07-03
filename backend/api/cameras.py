"""
Cameras and Streamers API endpoints.
Handles camera streaming, status monitoring and proxy operations to AI systems.
"""
from flask import Blueprint, request
from flask_restful import Api, Resource
import requests
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for cameras API
cameras_bp = Blueprint('cameras', __name__)
cameras_api = Api(cameras_bp)


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


# Register resources with the API
cameras_api.add_resource(CamerasResource, '/get_cameras')
cameras_api.add_resource(StreamerStatusResource, '/get_streamer_statuses')
