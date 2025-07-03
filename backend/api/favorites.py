"""
Favorites Management API endpoints.
Handles favorite streamers CRUD operations.
"""
from flask import Blueprint, request
from flask_restful import Api, Resource
import logging

from models import db, FavoriteStreamer

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for favorites API
favorites_bp = Blueprint('favorites', __name__)
favorites_api = Api(favorites_bp)


class FavoriteStreamersResource(Resource):
    def get(self):
        """Get all favorite streamers"""
        try:
            favorites = FavoriteStreamer.query.order_by(FavoriteStreamer.added_at.desc()).all()
            return [favorite.to_dict() for favorite in favorites], 200
        except Exception as e:
            logger.error(f"Error getting favorite streamers: {e}")
            return {'message': 'Failed to get favorite streamers'}, 500
    
    def post(self):
        """Add a streamer to favorites"""
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['streamerUuid', 'streamerHrName', 'streamerType', 'configTemplateName', 'computeUnitIP']
            for field in required_fields:
                if not data.get(field):
                    return {'message': f'{field} is required'}, 400
            
            # Check if already exists
            existing = FavoriteStreamer.query.filter_by(streamer_uuid=data['streamerUuid']).first()
            if existing:
                return {'message': 'Streamer already in favorites'}, 409
            
            # Create new favorite
            favorite = FavoriteStreamer(
                streamer_uuid=data['streamerUuid'],
                streamer_hr_name=data['streamerHrName'],
                streamer_type=data['streamerType'],
                config_template_name=data['configTemplateName'],
                compute_unit_ip=data['computeUnitIP'],
                is_alive=data.get('isAlive', 'false'),
                ip_address=data.get('ipAddress')
            )
            
            db.session.add(favorite)
            db.session.commit()
            
            logger.info(f"Added streamer to favorites: {data['streamerHrName']}")
            return favorite.to_dict(), 201
            
        except Exception as e:
            logger.error(f"Error adding favorite streamer: {e}")
            db.session.rollback()
            return {'message': 'Failed to add to favorites'}, 500
    
    def options(self):
        """Handle CORS preflight for favorites endpoint"""
        return {}, 200


class FavoriteStreamerResource(Resource):
    def delete(self, streamer_uuid):
        """Remove a streamer from favorites"""
        try:
            favorite = FavoriteStreamer.query.filter_by(streamer_uuid=streamer_uuid).first()
            if not favorite:
                return {'message': 'Streamer not found in favorites'}, 404
            
            streamer_name = favorite.streamer_hr_name
            db.session.delete(favorite)
            db.session.commit()
            
            logger.info(f"Removed streamer from favorites: {streamer_name}")
            return {'message': 'Removed from favorites successfully'}, 200
            
        except Exception as e:
            logger.error(f"Error removing favorite streamer: {e}")
            db.session.rollback()
            return {'message': 'Failed to remove from favorites'}, 500
    
    def options(self, streamer_uuid):
        """Handle CORS preflight for favorite streamer endpoint"""
        return {}, 200


# Register resources with the API
favorites_api.add_resource(FavoriteStreamersResource, '/api/favorites')
favorites_api.add_resource(FavoriteStreamerResource, '/api/favorites/<string:streamer_uuid>')
