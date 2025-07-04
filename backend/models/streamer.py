import datetime
from . import db

class Streamer(db.Model):
    __tablename__ = 'streamers'
    
    id = db.Column(db.Integer, primary_key=True)
    streamer_uuid = db.Column(db.String(100), unique=True, nullable=False)
    streamer_type = db.Column(db.String(50), nullable=False)  # camera, io, etc.
    streamer_type_uuid = db.Column(db.String(100), nullable=True)  # UUID for the streamer type
    streamer_hr_name = db.Column(db.String(100), nullable=False)
    config_template_name = db.Column(db.String(100), nullable=False)
    is_alive = db.Column(db.String(10), default='false')
    ip_address = db.Column(db.String(50), nullable=True)  # Store actual IP address
    compute_unit_id = db.Column(db.Integer, db.ForeignKey('compute_units.id'), nullable=True)
    status = db.Column(db.String(20), default='inactive')  # active, inactive, error
    last_seen = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    features = db.Column(db.Text, nullable=True)  # JSON string for camera features
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __init__(self, streamer_uuid=None, streamer_type=None, streamer_type_uuid=None, 
                 streamer_hr_name=None, config_template_name=None, is_alive='false', 
                 ip_address=None, compute_unit_id=None, status='inactive', features=None):
        self.streamer_uuid = streamer_uuid
        self.streamer_type = streamer_type
        self.streamer_type_uuid = streamer_type_uuid or 'camera'  # Default to 'camera'
        self.streamer_hr_name = streamer_hr_name
        self.config_template_name = config_template_name
        self.is_alive = is_alive
        self.ip_address = ip_address
        self.compute_unit_id = compute_unit_id
        self.status = status
        self.features = features
        self.last_seen = datetime.datetime.utcnow()
    
    def to_dict(self):
        import json
        features_list = []
        if self.features:
            try:
                features_list = json.loads(self.features) if isinstance(self.features, str) else self.features
            except (json.JSONDecodeError, TypeError):
                features_list = []
        
        return {
            'id': str(self.id),
            'streamerUuid': self.streamer_uuid,
            'name': self.streamer_hr_name,
            'status': self.status,
            'computeUnitIP': self.ip_address,
            'computeUnitId': self.compute_unit_id,
            'features': features_list,
            'streamer_uuid': self.streamer_uuid,  # Keep legacy field for compatibility
            'streamer_type': self.streamer_type,
            'streamer_type_uuid': self.streamer_type_uuid or 'camera',
            'streamer_hr_name': self.streamer_hr_name,
            'config_template_name': self.config_template_name,
            'is_alive': self.is_alive,
            'ip_address': self.ip_address,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
