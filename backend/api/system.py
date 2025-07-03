"""
System API endpoints.
Handles system statistics and health monitoring.
"""
from flask import Blueprint, jsonify
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
import logging
import requests

from utils.system_stats import get_system_stats

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for system API
system_bp = Blueprint('system', __name__)
system_api = Api(system_bp)


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


# Additional routes using Flask instead of Flask-RESTful for better control
@system_bp.route('/api/health')
def health_check():
    """Health check endpoint"""
    import datetime
    return jsonify({'status': 'healthy', 'timestamp': datetime.datetime.utcnow().isoformat()})


@system_bp.route('/api/ai_service/health', methods=['GET'])
def ai_service_health():
    """Checks the health of the AI service."""
    try:
        from config import Config
        AI_SERVICE_URL = Config.AI_SERVICE_URL

        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=5)
        response.raise_for_status()
        return jsonify(response.json()), response.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "AI service timed out"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": f"Could not connect to AI service"}), 503
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 502


# Register resources with the API
system_api.add_resource(SystemStatsResource, '/api/system/stats')
