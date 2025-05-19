import json
from scapy.all import sniff, IP
import subprocess

def extract_json_from_payload(payload_raw: str):
    """
    Extracts and parses the JSON part from a raw payload string.
    
    Args:
        payload_raw (str): The raw decoded payload string.

    Returns:
        dict or None: Parsed JSON object if successful, None otherwise.
    """
    json_start = payload_raw.find('{')
    if json_start != -1:
        json_part = payload_raw[json_start:]
        try:
            data = json.loads(json_part)
            return data
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return None
    else:
        print("No JSON found in payload.")
        return None

def packet_callback(packet):
    if IP in packet:
        if packet[IP].proto == 222:
            print('Received packet with proto 222')
            payload_raw = bytes(packet[IP].payload).decode(errors='ignore')
            try:
                payload = extract_json_from_payload(payload_raw)
                cmd = f"sh /delay.sh {payload['direction']} {payload['delay_ms']}"
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                print(result.stdout)
            except json.JSONDecodeError:
                print(f"Failed to decode payload as JSON: {repr(payload_raw)}")

print("Starting packet forwarder...")
sniff(filter="ip", prn=packet_callback, store=0)
