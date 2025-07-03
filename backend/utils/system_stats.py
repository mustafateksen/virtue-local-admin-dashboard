import psutil
import time
import subprocess
import random
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

def get_system_stats():
    """Get current system statistics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get CPU temperature (Raspberry Pi specific)
        temperature = 0.0
        try:
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temperature = float(f.read().strip()) / 1000.0
        except:
            # Fallback for non-Raspberry Pi systems
            try:
                result = subprocess.run(['vcgencmd', 'measure_temp'], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    temp_str = result.stdout.strip().replace('temp=', '').replace("'C", '')
                    temperature = float(temp_str)
            except:
                temperature = 45.0  # Default temperature for demo
        
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_string = format_uptime(uptime_seconds)
        
        return {
            'cpu_usage': round(float(cpu_percent), 1),
            'memory_usage': round(float(memory.percent), 1),
            'memory_total': memory.total,
            'memory_used': memory.used,
            'disk_usage': round((disk.used / disk.total) * 100, 1),
            'disk_total': disk.total,
            'disk_used': disk.used,
            'disk_free': disk.free,
            'temperature': round(float(temperature), 1),
            'uptime': uptime_string,
            'uptime_seconds': int(uptime_seconds)
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {
            'cpu_usage': 0.0,
            'memory_usage': 0.0,
            'memory_total': 0,
            'memory_used': 0,
            'disk_usage': 0.0,
            'disk_total': 0,
            'disk_used': 0,
            'disk_free': 0,
            'temperature': 0.0,
            'uptime': '0d 0h 0m',
            'uptime_seconds': 0
        }

def format_uptime(seconds):
    """Format uptime seconds to human readable string"""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    return f"{days}d {hours}h {minutes}m"

def get_device_stats(ip_address: str) -> Optional[Dict]:
    """Get system stats from a remote Raspberry Pi device"""
    from .ping import ping_device
    
    try:
        # This would be an API call to the remote device
        # For now, we'll simulate with mock data based on ping status
        if ping_device(ip_address):
            return {
                'cpu_usage': round(random.uniform(20, 80), 1),
                'memory_usage': round(random.uniform(40, 90), 1),
                'disk_usage': round(random.uniform(30, 95), 1),
                'temperature': round(random.uniform(40, 70), 1),
                'uptime': f"{random.randint(0, 30)}d {random.randint(0, 23)}h {random.randint(0, 59)}m"
            }
        return None
    except Exception as e:
        logger.error(f"Error getting device stats for {ip_address}: {e}")
        return None
