#!/usr/bin/env python3
"""
Simple HTTP server to serve the FPL Dashboard locally.
This allows the dashboard to access local CSV files without CORS issues.
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Configuration
PORT = 8000
DIRECTORY = Path(__file__).parent

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

def main():
    # Change to the dashboard directory
    os.chdir(DIRECTORY)
    
    # Create server
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print(f"🚀 FPL Dashboard server starting...")
        print(f"📁 Serving from: {DIRECTORY}")
        print(f"🌐 URL: http://localhost:{PORT}")
        print(f"📊 Dashboard: http://localhost:{PORT}/index.html")
        print(f"📁 CSV files: http://localhost:{PORT}/gw1/")
        print(f"\n💡 Press Ctrl+C to stop the server")
        print(f"🔍 Check browser console for detailed logging")
        
        # Open dashboard in browser
        webbrowser.open(f'http://localhost:{PORT}/index.html')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped by user")
            httpd.shutdown()

if __name__ == "__main__":
    main()
