"""
Memory Set API endpoints.
Handles memory set operations and proxy requests to AI systems.
"""
from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
import requests
import logging
import base64

from config import Config

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for memory set API
memory_set_bp = Blueprint('memory_set', __name__, url_prefix='/api/memory_set')
memory_set_api = Api(memory_set_bp)


class MemorySetRowsResource(Resource):
    def get(self):
        """Proxy request to AI service to get memory set rows"""
        try:
            compute_unit_ip = request.args.get('compute_unit_ip')
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip parameter is required'}, 400
            
            # Make request to AI service
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/get_memory_set_rows"
            
            logger.info(f"Proxying memory set rows request to: {ai_service_url}")
            
            response = requests.get(ai_service_url, timeout=10)
            response.raise_for_status()
            
            # Log the response to debug
            response_data = response.json()
            logger.info(f"Memory set response from compute unit: {response_data}")
            
            # Return the AI service response
            return response_data, 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying memory set rows request to AI service {compute_unit_ip}: {e}")
            return {'message': f'Failed to connect to AI service at {compute_unit_ip}'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in memory set rows proxy request: {e}")
            return {'message': 'Internal server error'}, 500


class MemorySetThumbnailsResource(Resource):
    def post(self):
        """Proxy request to AI service to fetch thumbnail images"""
        try:
            data = request.get_json()
            compute_unit_ip = data.get('compute_unit_ip')
            sample_uuids = data.get('sample_uuids')
            
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip is required'}, 400
            if not sample_uuids:
                return {'message': 'sample_uuids is required'}, 400
            
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/fetch_thumbnail_images"
            
            logger.info(f"Proxying memory set thumbnails request to: {ai_service_url}")
            
            # Prepare data for AI service
            ai_service_data = {
                "sample_uuids": sample_uuids
            }
            
            response = requests.post(ai_service_url, json=ai_service_data, timeout=10)
            response.raise_for_status()
            
            # Log the response to debug
            response_data = response.json()
            logger.info(f"Thumbnail response from compute unit: {response_data}")
            
            # Return the AI service response
            return response_data, 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying memory set thumbnails request to AI service: {e}")
            return {'message': f'Failed to connect to AI service'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in memory set thumbnails proxy request: {e}")
            return {'message': 'Internal server error'}, 500


class MemorySetDeleteResource(Resource):
    def delete(self):
        """Proxy request to AI service to delete memory set"""
        try:
            data = request.get_json()
            compute_unit_ip = data.get('compute_unit_ip')
            set_uuid = data.get('set_uuid')
            
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip is required'}, 400
            if not set_uuid:
                return {'message': 'set_uuid is required'}, 400
            
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/delete_memory_set"
            
            logger.info(f"Proxying memory set delete request to: {ai_service_url}")
            
            # Prepare data for AI service
            ai_service_data = {
                "set_uuid": set_uuid
            }
            
            response = requests.delete(ai_service_url, json=ai_service_data, timeout=10)
            response.raise_for_status()
            
            # Return the AI service response
            return response.json(), 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying memory set delete request to AI service: {e}")
            return {'message': f'Failed to connect to AI service'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in memory set delete proxy request: {e}")
            return {'message': 'Internal server error'}, 500


class MemorySetSampleUUIDsResource(Resource):
    def get(self):
        """Proxy request to AI service to get sample UUIDs for a memory set"""
        try:
            compute_unit_ip = request.args.get('compute_unit_ip')
            set_uuid = request.args.get('set_uuid')
            
            if not compute_unit_ip:
                return {'message': 'compute_unit_ip parameter is required'}, 400
            if not set_uuid:
                return {'message': 'set_uuid parameter is required'}, 400
            
            # Handle compute unit IP - remove port if it exists, then add :8000
            base_ip = compute_unit_ip.split(':')[0] if ':' in compute_unit_ip else compute_unit_ip
            ai_service_url = f"http://{base_ip}:8000/anomaly_app_v1/public/get_memory_set_data"
            
            logger.info(f"Proxying memory set data request to: {ai_service_url}")
            
            # Prepare data for AI service - this endpoint expects POST with JSON body
            ai_service_data = {
                "set_uuid": set_uuid
            }
            
            response = requests.post(ai_service_url, json=ai_service_data, timeout=10)
            response.raise_for_status()
            
            # Log the response to debug
            response_data = response.json()
            logger.info(f"Memory set data response from compute unit: {response_data}")
            
            # Extract sample_uuids from thumbnails array
            thumbnails = response_data.get('thumbnails', [])
            sample_uuids = [thumbnail.get('sample_uuid') for thumbnail in thumbnails if thumbnail.get('sample_uuid')]
            
            # Remove duplicates while preserving order
            unique_sample_uuids = list(dict.fromkeys(sample_uuids))
            
            logger.info(f"Extracted sample UUIDs: {unique_sample_uuids}")
            
            # Return just the sample UUIDs in the expected format
            return {'sample_uuids': unique_sample_uuids}, 200
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error proxying memory set data request to AI service {compute_unit_ip}: {e}")
            return {'message': f'Failed to connect to AI service at {compute_unit_ip}'}, 500
        except Exception as e:
            logger.error(f"Unexpected error in memory set data proxy request: {e}")
            return {'message': 'Internal server error'}, 500


# Register API resources
memory_set_api.add_resource(MemorySetRowsResource, '/rows')
memory_set_api.add_resource(MemorySetSampleUUIDsResource, '/samples')
memory_set_api.add_resource(MemorySetThumbnailsResource, '/thumbnails')
memory_set_api.add_resource(MemorySetDeleteResource, '/delete')
