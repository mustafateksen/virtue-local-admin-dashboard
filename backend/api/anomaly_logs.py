"""
Anomaly Logs API endpoints.
Handles anomaly logs operations and proxy requests to AI systems.
"""
from flask import Blueprint, request, jsonify, Response
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
import requests
import logging

from config import Config

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for anomaly logs API
anomaly_logs_bp = Blueprint('anomaly_logs', __name__, url_prefix='/api/anomaly_logs')
anomaly_logs_api = Api(anomaly_logs_bp)


class AnomalyLogsMetadataResource(Resource):
    def get(self):
        """Proxy request to AI service to get anomaly logs metadata"""
        try:
            compute_unit_ip = request.args.get('compute_unit_ip')
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip parameter is required'}, 400
            
            # Make request to AI service
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/get_anomaly_logs_metadata"
            
            logger.info(f"Proxying anomaly logs metadata request to: {ai_service_url}")
            
            response = requests.get(ai_service_url, timeout=10)
            response.raise_for_status()
            
            # Return the AI service response
            return response.json(), 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying anomaly logs metadata request to AI service {compute_unit_ip}: {e}")
            return {'message': f'Failed to connect to AI service at {compute_unit_ip}'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in anomaly logs metadata proxy request: {e}")
            return {'message': 'Internal server error'}, 500


class AnomalyLogImageResource(Resource):
    def get(self):
        """Proxy request to AI service to get anomaly log image"""
        try:
            compute_unit_ip = request.args.get('compute_unit_ip')
            file_path = request.args.get('file_path')
            
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip parameter is required'}, 400
            if not file_path:
                return {'message': 'file_path parameter is required'}, 400
            
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/get_anomaly_log_image_by_file_path"
            
            logger.info(f"Proxying anomaly log image request to: {ai_service_url}")
            
            # Send file_path as parameter to AI service
            response = requests.get(ai_service_url, params={'file_path': file_path}, timeout=30, stream=True)
            response.raise_for_status()
            
            # Determine content type from response headers
            content_type = response.headers.get('content-type', 'image/jpeg')
            
            # Extract filename from file_path for the response
            import os
            filename = os.path.basename(file_path) if file_path else 'anomaly_image.jpg'
            
            # Create Flask response with the image data
            def generate():
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk
            
            return Response(
                generate(),
                mimetype=content_type,
                headers={
                    'Content-Disposition': f'inline; filename="{filename}"',
                    'Cache-Control': 'public, max-age=3600'  # Cache for 1 hour
                }
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying anomaly log image request to AI service {compute_unit_ip}: {e}")
            # Return a simple error response
            return {'message': f'Failed to connect to AI service at {compute_unit_ip}'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in anomaly log image proxy request: {e}")
            return {'message': 'Internal server error'}, 500


class AnomalyLogStarResource(Resource):
    def post(self):
        """Proxy request to AI service to set star state for anomaly log"""
        try:
            data = request.get_json()
            compute_unit_ip = data.get('compute_unit_ip')
            anomaly_uuid = data.get('anomaly_uuid')
            is_starred = data.get('is_starred')
            
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip is required'}, 400
            if not anomaly_uuid:
                return {'message': 'anomaly_uuid is required'}, 400
            if is_starred is None:
                return {'message': 'is_starred is required'}, 400
            
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/set_star_state_for_anomaly_log"
            
            logger.info(f"Proxying anomaly log star request to: {ai_service_url}")
            
            # Prepare data for AI service
            ai_service_data = {
                "anomaly_uuid": anomaly_uuid,
                "is_starred": is_starred
            }
            
            response = requests.post(ai_service_url, json=ai_service_data, timeout=10)
            response.raise_for_status()
            
            # Return the AI service response
            return response.json(), 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying anomaly log star request to AI service: {e}")
            return {'message': f'Failed to connect to AI service'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in anomaly log star proxy request: {e}")
            return {'message': 'Internal server error'}, 500


class AnomalyLogDeleteResource(Resource):
    def delete(self):
        """Proxy request to AI service to delete anomaly log"""
        try:
            data = request.get_json()
            compute_unit_ip = data.get('compute_unit_ip')
            anomaly_uuid = data.get('anomaly_uuid')
            
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip is required'}, 400
            if not anomaly_uuid:
                return {'message': 'anomaly_uuid is required'}, 400
            
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/delete_anomaly_log_by_uuid"
            
            logger.info(f"Proxying anomaly log delete request to: {ai_service_url}")
            
            # Prepare data for AI service
            ai_service_data = {
                "anomaly_uuid": anomaly_uuid
            }
            
            response = requests.delete(ai_service_url, json=ai_service_data, timeout=10)
            response.raise_for_status()
            
            # Return the AI service response
            return response.json(), 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying anomaly log delete request to AI service: {e}")
            return {'message': f'Failed to connect to AI service'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in anomaly log delete proxy request: {e}")
            return {'message': 'Internal server error'}, 500


# Register API resources
anomaly_logs_api.add_resource(AnomalyLogsMetadataResource, '/metadata')
anomaly_logs_api.add_resource(AnomalyLogImageResource, '/image')
anomaly_logs_api.add_resource(AnomalyLogStarResource, '/star')
anomaly_logs_api.add_resource(AnomalyLogDeleteResource, '/delete')
