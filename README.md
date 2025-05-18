# Components Visualizer

This project provides a visualization tool for the components of a to simulate topology on the free5GC/UERANSIM system, the platform act as a topper layer for a 2D positions simulation as we provide the ability to enter 2D position (X, Y) and convert it into logical estimated detalys to use.

## Features

- Visualizes free5GC/UERANSIM components and their interactions.
- Easy to use and extend.
- Estimate the delay and the distance between linked components.
- Send packets when confirm to the components that should send the packets so we can enable the delay script and simulate the delay effect on elements.

## Prerequisites

- [Python 3.6+](https://www.python.org/)
- [Flask](https://flask.palletsprojects.com/)
- [Scapy](https://scapy.net/)

## Installation

```bash
git clone https://github.com/your-org/components-visualizer.git
cd components-visualizer
python -m venv venv
source /venve/bin/activate
pip install -r requirements.txt
```

## Running the Project

```bash
sh ./run.sh
```

The application will be available at [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Project Structure

- `listner/` - Contains the python script that acts like a listner on the receival container so it can setup the delay shell script with the exact delay and arguments needed.

## Contributing

Contributions are welcome! Please open issues or pull requests.

## License

This project is licensed under the MIT License.