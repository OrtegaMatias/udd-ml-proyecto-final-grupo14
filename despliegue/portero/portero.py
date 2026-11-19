"""Portero del simulador: página de acceso con usuario y contraseña, y sesión con cookie firmada.

nginx le pregunta a /acceso/verificar antes de cada petición (auth_request). Solo usa la biblioteca
estándar de Python. Variables de entorno (archivo despliegue/.env.portero, que no se versiona):
    PORTERO_USUARIO   usuario que se acepta
    PORTERO_SAL       sal en hexadecimal
    PORTERO_HASH      pbkdf2_hmac("sha256", clave, sal, 200_000) en hexadecimal
    PORTERO_SECRETO   secreto para firmar la cookie de sesión
"""
import hashlib
import hmac
import html
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

AQUI = Path(__file__).parent
PLANTILLA = (AQUI / "acceso.html").read_text(encoding="utf-8")
LOGO = (AQUI / "udd-logo.png").read_bytes()
USUARIO = os.environ["PORTERO_USUARIO"]
SAL = bytes.fromhex(os.environ["PORTERO_SAL"])
HASH = bytes.fromhex(os.environ["PORTERO_HASH"])
SECRETO = os.environ["PORTERO_SECRETO"].encode()
COOKIE = "g14_sesion"
DURACION = 7 * 24 * 3600   # una semana


def firmar(vence):
    return hmac.new(SECRETO, str(vence).encode(), hashlib.sha256).hexdigest()


def sesion_valida(cabecera_cookie):
    for parte in (cabecera_cookie or "").split(";"):
        nombre, _, valor = parte.strip().partition("=")
        if nombre == COOKIE and "." in valor:
            vence, firma = valor.split(".", 1)
            if vence.isdigit() and int(vence) > time.time() and hmac.compare_digest(firma, firmar(vence)):
                return True
    return False


def clave_correcta(usuario, clave):
    calculado = hashlib.pbkdf2_hmac("sha256", clave.encode(), SAL, 200_000)
    return hmac.compare_digest(usuario.encode(), USUARIO.encode()) & hmac.compare_digest(calculado, HASH)


def destino_seguro(siguiente):
    # Solo rutas del mismo sitio: evita redirigir a otro dominio
    if not siguiente.startswith("/") or siguiente.startswith("//") or siguiente.startswith("/acceso"):
        return "/"
    return siguiente


class Portero(BaseHTTPRequestHandler):
    def log_message(self, formato, *args):   # sin registro de cada petición (incluye /verificar)
        pass

    def _https(self):
        return self.headers.get("X-Forwarded-Proto") == "https" or "https" in (self.headers.get("Cf-Visitor") or "")

    def _responder(self, codigo, cuerpo=b"", tipo="text/html; charset=utf-8", extra=None):
        self.send_response(codigo)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(cuerpo)

    def _pagina(self, siguiente="/", usuario="", error=""):
        aviso = (f'<div class="error" role="alert">{html.escape(error)}</div>' if error else "")
        cuerpo = (PLANTILLA.replace("{{ERROR}}", aviso)
                  .replace("{{SIGUIENTE}}", html.escape(destino_seguro(siguiente), quote=True))
                  .replace("{{USUARIO}}", html.escape(usuario, quote=True)))
        self._responder(401 if error else 200, cuerpo.encode())

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/acceso/verificar":
            return self._responder(204 if sesion_valida(self.headers.get("Cookie")) else 401)
        if url.path == "/acceso/udd-logo.png":
            return self._responder(200, LOGO, "image/png", {"Cache-Control": "public, max-age=86400"})
        if url.path == "/acceso/salir":
            return self._responder(303, extra={"Location": "/acceso", "Set-Cookie": f"{COOKIE}=; Path=/; Max-Age=0"})
        if url.path in ("/acceso", "/acceso/"):
            siguiente = parse_qs(url.query).get("siguiente", ["/"])[0]
            if sesion_valida(self.headers.get("Cookie")):
                return self._responder(303, extra={"Location": destino_seguro(siguiente)})
            return self._pagina(siguiente)
        self._responder(404, b"No encontrado", "text/plain; charset=utf-8")

    def do_POST(self):
        if urlparse(self.path).path not in ("/acceso", "/acceso/"):
            return self._responder(404, b"No encontrado", "text/plain; charset=utf-8")
        largo = min(int(self.headers.get("Content-Length") or 0), 4096)
        datos = parse_qs(self.rfile.read(largo).decode("utf-8", "replace"))
        usuario = datos.get("usuario", [""])[0].strip()
        clave = datos.get("clave", [""])[0]
        siguiente = datos.get("siguiente", ["/"])[0]
        if not clave_correcta(usuario, clave):
            time.sleep(1.5)   # frena los intentos por fuerza bruta
            return self._pagina(siguiente, usuario, "Usuario o contraseña incorrectos.")
        vence = int(time.time()) + DURACION
        cookie = f"{COOKIE}={vence}.{firmar(vence)}; Path=/; Max-Age={DURACION}; HttpOnly; SameSite=Lax"
        if self._https():
            cookie += "; Secure"
        self._responder(303, extra={"Location": destino_seguro(siguiente), "Set-Cookie": cookie})


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8000), Portero).serve_forever()
