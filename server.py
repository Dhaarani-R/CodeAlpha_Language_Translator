"""
server.py - Local Development Server with Translation API Proxy

This script does TWO things:
1. Serves your HTML, CSS, and JS files (like a normal web server)
2. Acts as a PROXY for Google Translate API requests

WHY DO WE NEED A PROXY?
Browsers have a security feature called CORS (Cross-Origin Resource Sharing).
It prevents a webpage (running on localhost:8000) from directly calling 
a different server (translate.googleapis.com). This is to protect users from
malicious websites stealing data from other sites.

Our proxy solves this by:
- Frontend sends request to: http://localhost:8000/api/translate
- This server receives it, forwards it to Google Translate
- Google responds to our server (no CORS issue because server-to-server is allowed)
- Our server sends the response back to the frontend

HOW TO RUN:
    python server.py
Then open http://localhost:8000 in your browser.
"""

import http.server
import urllib.request
import urllib.parse
import json
import os

# Port number for our local server
PORT = 8000

# Directory containing our web files (index.html, style.css, app.js)
WEB_DIR = os.path.dirname(os.path.abspath(__file__))


class TranslatorHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP request handler that extends Python's built-in SimpleHTTPRequestHandler.
    
    SimpleHTTPRequestHandler already knows how to serve static files (HTML, CSS, JS).
    We add a special route '/api/translate' that proxies requests to Google Translate.
    """

    def __init__(self, *args, **kwargs):
        # Tell the file server where our web files are located
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        """
        Handle GET requests.
        If the URL starts with /api/translate, proxy to Google.
        Otherwise, serve the static file as normal.
        """
        if self.path.startswith("/api/translate"):
            self.handle_translate()
        else:
            # Default behavior: serve static files (index.html, style.css, etc.)
            super().do_GET()

    def handle_translate(self):
        """
        Proxy translation requests to Google Translate API.
        
        Expected URL format from frontend:
        /api/translate?sl=en&tl=ta&dt=t&dt=rm&q=Hello
        
        We forward this to:
        https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ta&dt=t&dt=rm&q=Hello
        """
        try:
            # Extract the query string (everything after the '?')
            query_string = self.path.split("?", 1)[1] if "?" in self.path else ""

            # Build the Google Translate URL
            google_url = f"https://translate.googleapis.com/translate_a/single?client=gtx&{query_string}"

            # Create a request with a User-Agent header (Google may block requests without one)
            req = urllib.request.Request(
                google_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )

            # Send the request to Google and read the response
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read()

            # Send the response back to the frontend browser
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            # These headers tell the browser: "It's OK, this response is safe to use"
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)

        except Exception as e:
            # If something goes wrong, send an error response
            error_msg = json.dumps({"error": str(e)})
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(error_msg.encode("utf-8"))

    def log_message(self, format, *args):
        """Override to show cleaner log messages in the terminal."""
        print(f"[Server] {args[0]}")


def main():
    """Start the development server."""
    with http.server.HTTPServer(("", PORT), TranslatorHandler) as server:
        print("=" * 55)
        print("  AlphaTranslate - Local Development Server")
        print("=" * 55)
        print(f"  Server running at: http://localhost:{PORT}")
        print(f"  Serving files from: {WEB_DIR}")
        print(f"  Translation proxy: http://localhost:{PORT}/api/translate")
        print()
        print("  Press Ctrl+C to stop the server")
        print("=" * 55)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n[Server] Shutting down...")
            server.shutdown()


if __name__ == "__main__":
    main()
