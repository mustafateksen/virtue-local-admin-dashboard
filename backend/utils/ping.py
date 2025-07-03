import requests
import logging

logger = logging.getLogger(__name__)

def ping_device_detailed(ip_address: str, via_ai_system: str = None) -> dict:
    """Ping a device directly to check if it responds with 'pong' from its own AI system"""
    result = {
        'reachable': False,
        'response': 'No response',
        'method': 'unknown'
    }
    
    try:
        # Ping the device directly at its own AI system endpoint
        if ':' in ip_address:
            # IP already includes port
            ping_url = f"http://{ip_address}/ping"
        else:
            # Add default AI system port
            ping_url = f"http://{ip_address}:8000/ping"
        
        logger.info(f"Pinging device directly at: {ping_url}")
        response = requests.get(ping_url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            result['method'] = 'direct_ai_ping'
            result['response'] = data.get('msg', data.get('status', 'Unknown'))
            # Only accept explicit "pong" response
            result['reachable'] = data.get('msg') == 'pong'
            logger.info(f"Device {ip_address} responded with: {result['response']}")
            return result
        else:
            result['method'] = 'direct_ai_ping'
            result['response'] = f"Device not found (HTTP {response.status_code})"
            result['reachable'] = False
            return result
            
    except requests.exceptions.ConnectionError:
        logger.warning(f"Connection refused to device {ip_address}")
        result['response'] = "Device not found - connection refused"
        result['method'] = 'connection_refused'
        result['reachable'] = False
        return result
    except requests.exceptions.Timeout:
        logger.warning(f"Timeout connecting to device {ip_address}")
        result['response'] = "Device not found - connection timeout"
        result['method'] = 'connection_timeout'
        result['reachable'] = False
        return result
    except Exception as e:
        logger.warning(f"Failed to ping device {ip_address}: {e}")
        result['response'] = "Device not found - unable to connect"
        result['method'] = 'connection_failed'
        result['reachable'] = False
        return result

def ping_device(ip_address: str, via_ai_system: str = None) -> bool:
    """Ping a device to check if it's online via AI system or direct ping"""
    result = ping_device_detailed(ip_address, via_ai_system)
    return result['reachable']
