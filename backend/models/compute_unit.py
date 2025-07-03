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
    
    def __init__(self, name=None, ip_address=None, status='offline', last_seen=None):
        self.name = name
        self.ip_address = ip_address
        self.status = status
        self.last_seen = last_seen or datetime.datetime.utcnow()
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'ipAddress': self.ip_address,
            'status': self.status,
            'lastSeen': self.last_seen.strftime('%Y-%m-%d %H:%M:%S') if self.last_seen else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
