"""
Apps Management API endpoints.
Handles app assignments, supported apps and app management operations.
"""
from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
import requests
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for apps API
apps_bp = Blueprint('apps', __name__)
apps_api = Api(apps_bp)


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
                    
                    # If streamer_uuid is provided, filter assignments to only include that specific streamer
                    if streamer_uuid and 'assignments' in ai_data:
                        original_count = len(ai_data['assignments'])
                        ai_data['assignments'] = [
                            assignment for assignment in ai_data['assignments']
                            if assignment.get('streamer_uuid') == streamer_uuid
                        ]
                        filtered_count = len(ai_data['assignments'])
                        logger.info(f"Filtered assignments for streamer {streamer_uuid}: {original_count} -> {filtered_count}")
                    
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


@apps_bp.route('/api/apps', methods=['GET'])
def get_apps():
    """Get apps from AI service"""
    try:
        # Use config to get AI service URL
        from config import Config
        AI_SERVICE_URL = Config.AI_SERVICE_URL
        
        # The endpoint on the actual AI service
        ai_service_endpoint = f"{AI_SERVICE_URL}/apps"
        
        # Make a GET request to the AI service
        response = requests.get(ai_service_endpoint)
        response.raise_for_status() # Raise an exception for bad status codes
        
        # Forward the JSON response
        return jsonify(response.json())

    except requests.exceptions.RequestException as e:
        logger.error(f"Error proxying request to AI service for apps: {e}")
        error_body = e.response.json() if e.response else {"error": "Failed to connect to AI service for apps"}
        status_code = e.response.status_code if e.response else 503
        return jsonify(error_body), status_code
    except Exception as e:
        logger.error(f"An unexpected error occurred in get_apps: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


# Register resources with the API
apps_api.add_resource(SupportedAppsResource, '/api/apps/supported')
apps_api.add_resource(StreamerAppAssignmentsResource, '/api/apps/assignments')
apps_api.add_resource(StreamerAppAssignmentUpdateResource, '/api/apps/assignments/update')
apps_api.add_resource(StreamerAppAssignmentDeleteResource, '/api/apps/assignments/delete')
