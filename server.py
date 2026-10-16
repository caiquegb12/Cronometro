"""Servidor local: serve o projeto e grava os logs de teste enviados por tests/index.html.

Uso: python server.py [porta]   (padrão 8000)
Testes no navegador: http://localhost:8000/tests/
Logs: logs/latest.log (última execução) e logs/history.log (histórico).
"""
import json
import re
import socket
import sys
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOG_DIR = ROOT / "logs"
MAX_BODY = 200_000


def write_logs(lines):
    LOG_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    text = "\n".join(f"{stamp} {line}" for line in lines) + "\n"
    (LOG_DIR / "latest.log").write_text(text, encoding="utf-8")
    with (LOG_DIR / "history.log").open("a", encoding="utf-8") as history:
        history.write(f"=== execução {stamp} ===\n{text}\n")


class Handler(SimpleHTTPRequestHandler):
    on_result = None  # callback(failed: int), usado pelo run_tests.py

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_GET(self):
        range_header = self.headers.get("Range")
        if range_header:
            path = Path(self.translate_path(self.path.split("?")[0]))
            if path.is_file() and self.send_range(path, range_header):
                return
        super().do_GET()

    def send_range(self, path, header):
        """Atende 'Range: bytes=a-b' (o navegador precisa disso para reiniciar/buscar em vídeos)."""
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", header.strip())
        if not match or match.groups() == ("", ""):
            return False
        size = path.stat().st_size
        first, last = match.groups()
        if first == "":
            start, end = max(0, size - int(last)), size - 1
        else:
            start, end = int(first), min(int(last) if last else size - 1, size - 1)

        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return True

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        try:
            with path.open("rb") as media:
                media.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = media.read(min(65536, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # o navegador cancelou a transferência
        return True

    def do_POST(self):
        if self.path != "/__log":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            if not 0 < length <= MAX_BODY:
                raise ValueError("tamanho inválido")
            data = json.loads(self.rfile.read(length))
            lines = [str(line) for line in data["lines"]]
            failed = int(data["failed"])
        except (ValueError, KeyError, TypeError):
            self.send_error(400)
            return
        write_logs(lines)
        self.send_response(204)
        self.end_headers()
        if Handler.on_result:
            Handler.on_result(failed)

    def log_message(self, format, *args):
        pass


def get_local_ips():
    ips = []
    try:
        hostname = socket.gethostname()
        for family, _, _, _, sockaddr in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM):
            if family == socket.AF_INET:
                ips.append(sockaddr[0])
    except OSError:
        pass
    unique = []
    seen = set()
    for ip in ips:
        if ip and ip not in seen and not ip.startswith("127."):
            seen.add(ip)
            unique.append(ip)
    return unique


def make_server(port):
    handler = partial(Handler, directory=str(ROOT))
    return ThreadingHTTPServer(("0.0.0.0", port), handler)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Site:   http://localhost:{port}/")
    for ip in get_local_ips():
        print(f"Rede:   http://{ip}:{port}/")
    print(f"Testes: http://localhost:{port}/tests/")
    make_server(port).serve_forever()
