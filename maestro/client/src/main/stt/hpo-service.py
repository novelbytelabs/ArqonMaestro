import json
import logging
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys

# Import from standard path or local site-packages
try:
    from arqonhpo import ArqonSolver
except ImportError:
    print("FATAL: Failed to import arqonhpo. Ensure environment is active.")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("hpo-service")

global_solver = None
global_config = None

class HpoServer(BaseHTTPRequestHandler):
    def initialize_solver(self):
        global global_solver, global_config
        try:
            global_solver = ArqonSolver(json.dumps(global_config))
            logger.info("ArqonSolver initialized from config")
        except Exception as e:
            logger.error(f"Failed to initialize ArqonSolver: {e}")

    def do_GET(self):
        global global_solver
        if self.path == "/healthz" or self.path == "/readyz":
            if global_solver is not None:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "history_len": global_solver.get_history_len()}).encode())
            else:
                self.send_response(503)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            req_data = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        response_data = {}
        status_code = 200

        global global_solver, global_config
        try:
            if self.path == "/init":
                global_config = req_data
                self.initialize_solver()
                response_data = {"status": "initialized"}
            
            elif self.path == "/seed":
                if global_solver is None:
                    status_code = 400
                    response_data = {"error": "Solver not initialized"}
                else:
                    global_solver.seed(json.dumps([req_data]))
                    response_data = {"status": "seeded", "history_len": global_solver.get_history_len()}

            elif self.path == "/ask_one":
                if global_solver is None:
                    status_code = 400
                    response_data = {"error": "Solver not initialized"}
                else:
                    candidate = global_solver.ask_one()
                    response_data = {"candidate": candidate if isinstance(candidate, dict) else json.loads(candidate)}
            else:
                status_code = 404
        except Exception as e:
            logger.error(f"Error processing {self.path}: {e}")
            status_code = 500
            response_data = {"error": str(e)}

        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response_data).encode())

def run(port=7782):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, HpoServer)
    logger.info(f"Starting HPO service on port {port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    logger.info("Stopping HPO service")

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 7782
    run(port)
