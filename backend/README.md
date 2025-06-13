# Virtue Admin Dashboard - Backend

This is the Python Flask backend API server for the Virtue Raspberry Pi Admin Dashboard.

## Features

- **Authentication**: JWT-based authentication with admin user registration
- **System Monitoring**: Real-time system statistics (CPU, Memory, Disk, Temperature)
- **Device Management**: Add, monitor, and manage multiple Raspberry Pi devices
- **Real-time Updates**: Background monitoring of device status and metrics
- **RESTful API**: Clean REST API endpoints for frontend integration

## Requirements

- Python 3.8+
- Flask and dependencies (see requirements.txt)
- SQLite database (default) or PostgreSQL
- Redis (optional, for caching)

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variables (optional):
```bash
export SECRET_KEY="your-secret-key"
export JWT_SECRET_KEY="your-jwt-secret"
export DATABASE_URL="sqlite:///virtue_admin.db"
```

4. Run the application:
```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `GET /api/auth/check-registration` - Check if admin user exists
- `POST /api/auth/register` - Register admin user (first time only)
- `POST /api/auth/login` - Login and get JWT token

### System Monitoring
- `GET /api/system/stats` - Get current system statistics

### Device Management
- `GET /api/devices` - Get all registered Raspberry Pi devices
- `POST /api/devices` - Add a new device
- `GET /api/devices/<id>` - Get specific device details
- `PUT /api/devices/<id>` - Update device information
- `DELETE /api/devices/<id>` - Delete a device
- `POST /api/devices/refresh` - Refresh all device statuses

### Health Check
- `GET /api/health` - API health check

## Database Schema

### Users Table
- `id` - Primary key
- `name` - Full name
- `username` - Unique username
- `password_hash` - Hashed password
- `role` - User role (admin)
- `is_active` - Account status
- `created_at` - Creation timestamp
- `last_login` - Last login timestamp

### Raspberry Devices Table
- `id` - Primary key
- `name` - Device name
- `ip_address` - Device IP address
- `status` - Device status (online/offline/warning)
- `last_seen` - Last ping timestamp
- `cpu_usage` - Current CPU usage %
- `memory_usage` - Current memory usage %
- `disk_usage` - Current disk usage %
- `temperature` - Current temperature (°C)
- `uptime` - System uptime string
- `created_at` - Device registration timestamp

## Configuration

The application can be configured using environment variables:

- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT token secret
- `DATABASE_URL` - Database connection string
- `FLASK_ENV` - Environment (development/production)

## Background Tasks

The application runs a background thread that:
- Monitors all registered devices every 30 seconds
- Updates device status (online/offline/warning)
- Collects system metrics from each device
- Sets warning status if metrics exceed thresholds

## Security

- Passwords are hashed using bcrypt
- API endpoints protected with JWT tokens
- CORS configured for frontend origins
- Input validation and error handling

## Deployment

For production deployment:

1. Use a production WSGI server (gunicorn included)
2. Set proper environment variables
3. Use PostgreSQL instead of SQLite
4. Configure proper logging
5. Set up reverse proxy (nginx)

Example gunicorn command:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Raspberry Pi Integration

To enable full device monitoring, remote Raspberry Pi devices should:
1. Have SSH access enabled
2. Run a companion monitoring agent (optional)
3. Allow API calls from the main dashboard device
4. Have proper network configuration

The current implementation uses ping for basic connectivity and mock data for metrics. In production, you would implement actual SSH-based or API-based metric collection.
