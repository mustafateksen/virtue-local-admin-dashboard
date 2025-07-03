import datetime
from . import db

class FavoriteStreamer(db.Model):
    __tablename__ = 'favorite_streamers'
    
    id = db.Column(db.Integer, primary_key=True)
    streamer_uuid = db.Column(db.String(100), unique=True, nullable=False)
    streamer_hr_name = db.Column(db.String(100), nullable=False)
    streamer_type = db.Column(db.String(50), nullable=False)
    config_template_name = db.Column(db.String(100), nullable=False)
    compute_unit_ip = db.Column(db.String(50), nullable=False)
    is_alive = db.Column(db.String(10), default='false')
    ip_address = db.Column(db.String(50), nullable=True)
    added_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __init__(self, streamer_uuid=None, streamer_hr_name=None, streamer_type=None,
                 config_template_name=None, compute_unit_ip=None, is_alive='false', ip_address=None):
        self.streamer_uuid = streamer_uuid
        self.streamer_hr_name = streamer_hr_name
        self.streamer_type = streamer_type
        self.config_template_name = config_template_name
        self.compute_unit_ip = compute_unit_ip
        self.is_alive = is_alive
        self.ip_address = ip_address
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'streamerUuid': self.streamer_uuid,
            'streamerHrName': self.streamer_hr_name,
            'streamerType': self.streamer_type,
            'configTemplateName': self.config_template_name,
            'computeUnitIP': self.compute_unit_ip,
            'isAlive': self.is_alive,
            'ipAddress': self.ip_address,
            'addedAt': self.added_at.isoformat() if self.added_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
