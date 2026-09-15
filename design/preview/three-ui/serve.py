#!/usr/bin/env python3
"""Dev preview server for the Holoframe mockup (DEV ONLY, not shipped).

Serves the REPO ROOT (the mockup references game/assets + backgrounds by
relative path) and redirects / straight to the mockup:

    python3 design/preview/three-ui/serve.py [port]
"""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8124
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
TARGET = '/design/preview/three-ui/index.html'


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/', '/index.html'):
            self.send_response(302)
            self.send_header('Location', TARGET)
            self.end_headers()
            return
        super().do_GET()


if __name__ == '__main__':
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('0.0.0.0', PORT), handler) as httpd:
        print('serving %s on http://0.0.0.0:%d/ -> %s' % (ROOT, PORT, TARGET))
        httpd.serve_forever()
