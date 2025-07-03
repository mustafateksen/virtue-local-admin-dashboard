import datetime
from . import db

class Streamer(db.Model):
    __tablename__ = 'streamers'
    
    id = db.Column(db.Integer, primary_key=True)
    streamer_uuid = db.Column(db.String(100), unique=True, nullable=False)
    streamer_type = db.Column(db.String(50), nullable=False)  # camera, io, etc.
    streamer_hr_name = db.Column(db.String(100), nullable=False)
    config_template_name = db.Column(db.String(100), nullable=False)
    is_alive = db.Column(db.String(10), default='false')
    ip_address = db.Column(db.String(50), nullable=True)  # Store actual IP address
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __init__(self, streamer_uuid=None, streamer_type=None, streamer_hr_name=None, 
                 config_template_name=None, is_alive='false', ip_address=None):
        self.streamer_uuid = streamer_uuid
        self.streamer_type = streamer_type
        self.streamer_hr_name = streamer_hr_name
        self.config_template_name = config_template_name
        self.is_alive = is_alive
        self.ip_address = ip_address
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'streamer_uuid': self.streamer_uuid,
            'streamer_type': self.streamer_type,
            'streamer_hr_name': self.streamer_hr_name,
            'config_template_name': self.config_template_name,
            'is_alive': self.is_alive,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
