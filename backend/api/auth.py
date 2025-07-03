import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/check-registration', methods=['GET'])
def check_registration():
    """Check if admin user is registered"""
    user_count = User.query.count()
    return {
        'isRegistered': user_count > 0,
        'userCount': user_count
    }

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register the admin user (only if no users exist)"""
    try:
        # Check if any users already exist
        if User.query.count() > 0:
            return {'message': 'Admin user already exists'}, 400
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'username', 'password']
        for field in required_fields:
            if not data.get(field):
                return {'message': f'{field} is required'}, 400
        
        # Validate username format
        username = data['username'].strip().lower()
        if len(username) < 3:
            return {'message': 'Username must be at least 3 characters long'}, 400
        
        # Validate password
        if len(data['password']) < 6:
            return {'message': 'Password must be at least 6 characters long'}, 400
        
        # Create admin user
        user = User()
        user.name = data['name'].strip()
        user.username = username
        user.role = 'admin'
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"Admin user registered: {username}")
        return {'message': 'Admin user registered successfully'}, 201
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        db.session.rollback()
        return {'message': 'Registration failed'}, 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    try:
        data = request.get_json()
        
        username = data.get('username', '').strip().lower()
        password = data.get('password', '')
        
        if not username or not password:
            return {'message': 'Username and password are required'}, 400
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            return {'message': 'Invalid username or password'}, 401
        
        if not user.is_active:
            return {'message': 'Account is disabled'}, 401
        
        # Update last login
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        logger.info(f"User logged in: {username}")
        return {
            'access_token': access_token,
            'user': user.to_dict()
        }, 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return {'message': 'Login failed'}, 500
