"""Roda tests/index.html em um navegador headless e imprime o log.

Uso: python run_tests.py   (código de saída 0 = tudo passou)
"""
import os
import shutil
import subprocess
import sys
import tempfile
import threading

from server import LOG_DIR, Handler, make_server

TIMEOUT_SECONDS = 180


def find_browser():
    candidates = [
        shutil.which("msedge"),
        shutil.which("chrome"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    ]
    return next((path for path in candidates if path and os.path.exists(path)), None)


def stop(process):
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True)
    else:
        process.kill()


def main():
    browser = find_browser()
    if not browser:
        print("Nenhum navegador (Edge/Chrome) encontrado.")
        return 2

    result = {}
    done = threading.Event()

    def on_result(failed):
        result["failed"] = failed
        done.set()

    Handler.on_result = on_result
    httpd = make_server(0)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    profile = tempfile.mkdtemp(prefix="cronometro-tests-")
    process = subprocess.Popen(
        [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            f"--user-data-dir={profile}",
            f"http://127.0.0.1:{port}/tests/",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        finished = done.wait(TIMEOUT_SECONDS)
    finally:
        stop(process)
        httpd.shutdown()
        shutil.rmtree(profile, ignore_errors=True)

    if not finished:
        print(f"Timeout: nenhum resultado em {TIMEOUT_SECONDS}s.")
        return 2

    print((LOG_DIR / "latest.log").read_text(encoding="utf-8"))
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
