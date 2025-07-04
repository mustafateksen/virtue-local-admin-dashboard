import datetime
from . import db

class ComputeUnit(db.Model):
    __tablename__ = 'compute_units'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), default='offline')  # online, offline
    last_seen = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationship with streamers
    streamers = db.relationship('Streamer', backref='compute_unit', lazy=True)
    
    def __init__(self, name=None, ip_address=None, status='offline', last_seen=None):
        self.name = name
        self.ip_address = ip_address
        self.status = status
        self.last_seen = last_seen or datetime.datetime.utcnow()
    
    def to_dict(self, include_cameras=True):
        result = {
            'id': str(self.id),
            'name': self.name,
            'ip_address': self.ip_address,  # Keep consistent with backend
            'ipAddress': self.ip_address,   # Also provide camelCase for frontend
            'status': self.status,
            'last_seen': self.last_seen.strftime('%Y-%m-%d %H:%M:%S') if self.last_seen else None,
            'lastSeen': self.last_seen.strftime('%Y-%m-%d %H:%M:%S') if self.last_seen else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_cameras:
            # Include cameras from database - import here to avoid circular imports
            from .streamer import Streamer
            cameras = []
            streamers = Streamer.query.filter_by(compute_unit_id=self.id, streamer_type='camera').all()
            for streamer in streamers:
                cameras.append(streamer.to_dict())
            result['cameras'] = cameras
        
        return result
