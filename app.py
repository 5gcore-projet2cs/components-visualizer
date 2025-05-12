from flask import Flask, render_template, request, redirect, url_for, jsonify

app = Flask(__name__)
elements = []

@app.route('/')
def index():
    return render_template('index.html', elements=elements)

@app.route('/add', methods=['POST'])
def add_element():
    try:
        element_type = request.form['type']
        x = int(request.form['x'])
        y = int(request.form['y'])

        if not (0 <= x < 10 and 0 <= y < 10):
            return "Coordinates must be between 0 and 9", 400

        elements.append({'type': element_type, 'x': x, 'y': y})
        return redirect(url_for('index'))
    except Exception as e:
        return f"Invalid input: {e}", 400

@app.route('/reset', methods=['POST'])
def reset_elements():
    elements.clear()
    return redirect(url_for('index'))

@app.route('/api/elements')
def api_elements():
    return jsonify(elements)

if __name__ == '__main__':
    app.run(debug=True)
