from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file
import math
import json
import io

app = Flask(__name__)
elements = []
links = []

@app.route('/')
def index():
    return render_template('index.html', elements=elements, links=links)

@app.route('/add', methods=['POST'])
def add_element():
    try:
        element_type = request.form['type']
        x = int(request.form['x'])
        y = int(request.form['y'])
        ip_address = request.form['ip_address']
        
        if not (0 <= x < 10 and 0 <= y < 10):
            return "Coordinates must be between 0 and 9", 400
        
        # Check if the position is already taken
        for element in elements:
            if element['x'] == x and element['y'] == y:
                return "Position already taken", 400
            if element['ip_address'] == ip_address:
                return "IP address already in use", 400
        
        element_id = len(elements)
        elements.append({'id': element_id, 'type': element_type, 'x': x, 'y': y, 'ip_address': ip_address})
        return redirect(url_for('index'))
    except Exception as e:
        return f"Invalid input: {e}", 400

@app.route('/add_link', methods=['POST'])
def add_link():
    try:
        from_id = int(request.form['from_id'])
        to_id = int(request.form['to_id'])
        # Validate the element IDs
        if from_id >= len(elements) or to_id >= len(elements) or from_id < 0 or to_id < 0:
            return "Invalid element IDs", 400
        links.append({'id': len(links), 'from': from_id, 'to': to_id})
        return redirect(url_for('index'))
    except Exception as e:
        return f"Invalid input: {e}", 400

@app.route('/reset', methods=['POST'])
def reset_elements():
    elements.clear()
    links.clear()
    return redirect(url_for('index'))

@app.route('/calculate_topology')
def calculate_topology():
    results = []
    
    for link in links:
        from_element = elements[link['from']]
        to_element = elements[link['to']]
        
        # Calculate Euclidean distance (assuming 1 grid unit = 1km)
        distance = math.sqrt((from_element['x'] - to_element['x'])**2 + 
                           (from_element['y'] - to_element['y'])**2)
        
        # Calculate delay (0.005ms per km with some randomness for realism)
        # The speed of light in fiber is about 200,000 km/s, which is 5μs per km
        # We multiply by 1000 to convert to milliseconds
        delay = distance * 0.005 * 1000
        
        # Add some variation based on element types
        if from_element['type'] == 'gNb' and to_element['type'] == 'UPF':
            delay *= 1.1  # 10% more delay for gNb to UPF connections
        elif from_element['type'] == 'UE' and to_element['type'] == 'gNb':
            delay *= 1.2  # 20% more delay for UE to gNb connections
        
        results.append({
            'link_id': link['id'],
            'from_id': link['from'],
            'to_id': link['to'],
            'from_type': from_element['type'],
            'to_type': to_element['type'],
            'from_ip': from_element['ip_address'],
            'to_ip': to_element['ip_address'],
            'distance': distance,
            'delay': delay
        })
    
    return jsonify(results)

@app.route('/api/elements')
def api_elements():
    return jsonify(elements)

@app.route('/api/links')
def api_links():
    return jsonify(links)

# New routes for JSON export/import
@app.route('/export_topology')
def export_topology():
    topology = {
        'elements': elements,
        'links': links
    }
    
    # Create a JSON file in memory
    json_data = json.dumps(topology, indent=2)
    buffer = io.BytesIO(json_data.encode('utf-8'))
    buffer.seek(0)
    
    return send_file(
        buffer,
        as_attachment=True,
        download_name="topology.json",
        mimetype="application/json"
    )

@app.route('/import_topology', methods=['POST'])
def import_topology():
    try:
        if 'topology_file' not in request.files:
            return "No file part", 400
            
        file = request.files['topology_file']
        
        if file.filename == '':
            return "No selected file", 400
            
        if file and file.filename.endswith('.json'):
            topology_data = json.load(file)
            
            # Validate the structure of the JSON file
            if 'elements' not in topology_data or 'links' not in topology_data:
                return "Invalid topology JSON format", 400
                
            # Clear existing topology
            elements.clear()
            links.clear()
            
            # Load elements
            for element in topology_data['elements']:
                if all(k in element for k in ['id', 'type', 'x', 'y', 'ip_address']):
                    elements.append(element)
                else:
                    return "Invalid element format in JSON", 400
            
            # Load links
            for link in topology_data['links']:
                if all(k in link for k in ['id', 'from', 'to']):
                    # Validate element IDs in links
                    if link['from'] < len(elements) and link['to'] < len(elements):
                        links.append(link)
                    else:
                        return "Invalid element reference in links", 400
                else:
                    return "Invalid link format in JSON", 400
                    
            return redirect(url_for('index'))
        else:
            return "Invalid file type, must be JSON", 400
    except Exception as e:
        return f"Error importing topology: {e}", 400

if __name__ == '__main__':
    app.run(debug=True)
