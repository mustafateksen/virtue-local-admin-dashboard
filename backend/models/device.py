import datetime
from . import db

class RaspberryDevice(db.Model):
    __tablename__ = 'raspberry_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(15), unique=True, nullable=False)
    status = db.Column(db.String(20), default='offline')  # online, offline, warning
    last_seen = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # System metrics (updated periodically)
    cpu_usage = db.Column(db.Float, default=0.0)
    memory_usage = db.Column(db.Float, default=0.0)
    disk_usage = db.Column(db.Float, default=0.0)
    temperature = db.Column(db.Float, default=0.0)
    uptime = db.Column(db.String(50), default='0d 0h 0m')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'ipAddress': self.ip_address,
            'status': self.status,
            'lastSeen': self.last_seen.strftime('%Y-%m-%d %H:%M:%S') if self.last_seen else None,
            'cpuUsage': self.cpu_usage,
            'memoryUsage': self.memory_usage,
            'diskUsage': self.disk_usage,
            'temperature': self.temperature,
            'uptime': self.uptime,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
