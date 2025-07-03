from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models to make them available
from .user import User
from .device import RaspberryDevice
from .streamer import Streamer
from .compute_unit import ComputeUnit
from .favorite_streamer import FavoriteStreamer

__all__ = ['db', 'User', 'RaspberryDevice', 'Streamer', 'ComputeUnit', 'FavoriteStreamer']
