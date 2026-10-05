"""Local static preview with the site's existing clean HTML URLs.

Run from the repository root: python3 serve.py [port]
This is a development server, not a production server.
"""

import argparse
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


class PortfolioHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        url = urlsplit(self.path)
        path = Path(self.translate_path(url.path))

        # Keep filename aliases aligned with vercel.json's cleanUrls setting.
        if url.path.endswith('.html') and path.is_file():
            destination = url.path[:-5]
            if path.name == 'index.html':
                destination = url.path[:-10]
            self.send_response(HTTPStatus.PERMANENT_REDIRECT)
            self.send_header('Location', urlunsplit(('', '', destination, url.query, '')))
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None

        if not path.exists() and not path.suffix and not url.path.endswith('/'):
            html_path = path.with_suffix('.html')
            if html_path.is_file():
                self.path = urlunsplit(('', '', url.path + '.html', url.query, ''))
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        # Unknown routes retain HTTP 404 and the requested URL.
        if code == HTTPStatus.NOT_FOUND:
            page = Path(self.directory) / '404.html'
            if page.is_file():
                content = page.read_bytes()
                self.send_response(code)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(content)
                return
        super().send_error(code, message, explain)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('port', type=int, nargs='?', default=8000)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = partial(PortfolioHandler, directory=str(root))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        print(f'Preview: http://127.0.0.1:{args.port}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
