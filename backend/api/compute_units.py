"""
Compute Units API endpoints.
Handles compute units CRUD operations and status management.
"""
from flask import Blueprint, request, jsonify
from flask_restful import Api, Resource
import datetime
import logging

from models import db, ComputeUnit
from utils.ping import ping_device_detailed

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint for compute units API
compute_units_bp = Blueprint('compute_units', __name__)
compute_units_api = Api(compute_units_bp)


class ComputeUnitsResource(Resource):
    def get(self):
        """Get all compute units"""
        try:
            compute_units = ComputeUnit.query.all()
            result = [unit.to_dict() for unit in compute_units]
            logger.info(f"Retrieved {len(result)} compute units")
            return {'compute_units': result}, 200
        except Exception as e:
            logger.error(f"Error retrieving compute units: {e}")
            return {'message': 'Failed to retrieve compute units'}, 500
    
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
            
            logger.info(f"Added new compute unit: {name} ({ip_address})")
            return {'compute_unit': new_unit.to_dict()}, 201
            
        except Exception as e:
            logger.error(f"Error adding compute unit: {e}")
            db.session.rollback()
            return {'message': 'Failed to add compute unit'}, 500
    
    def options(self):
        """Handle CORS preflight for compute units endpoint"""
        return {}, 200


class ComputeUnitResource(Resource):
    def delete(self, unit_id):
        """Delete a compute unit"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            ip_address = compute_unit.ip_address
            db.session.delete(compute_unit)
            db.session.commit()
            
            logger.info(f"Deleted compute unit: {ip_address}")
            return {'message': 'Compute unit deleted successfully'}, 200
            
        except Exception as e:
            logger.error(f"Error deleting compute unit: {e}")
            db.session.rollback()
            return {'message': 'Failed to delete compute unit'}, 500
    
    def put(self, unit_id):
        """Update compute unit status"""
        try:
            compute_unit = ComputeUnit.query.get(unit_id)
            if not compute_unit:
                return {'message': 'Compute unit not found'}, 404
            
            data = request.get_json()
            if data:
                if 'status' in data:
                    compute_unit.status = data['status']
                if 'name' in data:
                    compute_unit.name = data['name']
                
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


# Register resources with the API
compute_units_api.add_resource(ComputeUnitsResource, '/api/compute_units')
compute_units_api.add_resource(ComputeUnitResource, '/api/compute_units/<int:unit_id>')
