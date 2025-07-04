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
        """Serve anomaly log image by fetching base64 image from compute unit using anomaly_uuid"""
        try:
            compute_unit_ip = request.args.get('compute_unit_ip')
            anomaly_uuid = request.args.get('anomaly_uuid')
            
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip parameter is required'}, 400
            if not anomaly_uuid:
                return {'message': 'anomaly_uuid parameter is required'}, 400
            
            logger.info(f"Fetching anomaly image from compute unit {compute_unit_ip}, anomaly_uuid: {anomaly_uuid}")
            
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/get_anomaly_logs_by_uuid"
            
            # Prepare data for AI service - POST request with anomaly_uuids list
            ai_service_data = {
                "anomaly_uuids": [anomaly_uuid]
            }
            
            logger.info(f"POSTing to compute unit for anomaly image: {ai_service_url}")
            response = requests.post(ai_service_url, json=ai_service_data, timeout=10)
            response.raise_for_status()
            
            response_data = response.json()
            
            # Check if we got a valid response with anomaly logs
            if not response_data.get('anomaly_logs') or len(response_data['anomaly_logs']) == 0:
                logger.error(f"No anomaly log found for UUID: {anomaly_uuid}")
                return {'message': f'Anomaly log not found: {anomaly_uuid}'}, 404
            
            anomaly_log = response_data['anomaly_logs'][0]
            
            # Check if frame_base64_jpeg exists
            if not anomaly_log.get('frame_base64_jpeg'):
                logger.error(f"No frame_base64_jpeg found for anomaly UUID: {anomaly_uuid}")
                return {'message': f'Image data not found for anomaly: {anomaly_uuid}'}, 404
            
            # Decode base64 image
            import base64
            try:
                image_data = base64.b64decode(anomaly_log['frame_base64_jpeg'])
                logger.info(f"Successfully decoded base64 image for anomaly UUID: {anomaly_uuid}")
                
                # Create Flask response with the image data
                return Response(
                    image_data,
                    mimetype='image/jpeg',
                    headers={
                        'Content-Disposition': f'inline; filename="anomaly_{anomaly_uuid[:8]}.jpg"',
                        'Cache-Control': 'public, max-age=3600'  # Cache for 1 hour
                    }
                )
                
            except Exception as decode_error:
                logger.error(f"Failed to decode base64 image for anomaly UUID {anomaly_uuid}: {decode_error}")
                return {'message': f'Failed to decode image data for anomaly: {anomaly_uuid}'}, 500
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching anomaly image from AI service {compute_unit_ip}: {e}")
            return {'message': f'Failed to connect to AI service at {compute_unit_ip}'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in anomaly log image request: {e}")
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
