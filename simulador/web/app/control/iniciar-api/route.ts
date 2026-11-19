// Inicia la API de TabPFN (FastAPI, puerto 8014) desde la pantalla de espera, cuando el frontend
// está arriba pero la API no responde (por ejemplo, si se cayó). Solo sirve en el Mac donde corre
// el simulador: Next.js escucha en 127.0.0.1 y esta ruta exige una cabecera propia y el mismo origen.
// La API Key se lee de ~/.config/tabpfn/token y solo viaja como variable de entorno del proceso;
// nunca se devuelve al navegador.
import { spawn } from "node:child_process";
import { existsSync, openSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

export const dynamic = "force-dynamic";

const API = process.env.SIMULADOR_API ?? "http://127.0.0.1:8014";
const RAIZ = process.env.SIMULADOR_RAIZ ?? path.resolve(process.cwd(), "..", "..");   // npm run start corre en simulador/web
let ultimoInicio = 0;

async function apiResponde() {
  try {
    const r = await fetch(`${API}/api/salud`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Evita que otra página web dispare esta ruta: cabecera propia (fuerza preflight) y mismo origen
  const origen = request.headers.get("origin");
  const host = request.headers.get("host");
  if (request.headers.get("x-simulador") !== "iniciar-api" || (origen && host && new URL(origen).host !== host)) {
    return Response.json({ estado: "rechazado" }, { status: 403 });
  }
  if (await apiResponde()) return Response.json({ estado: "ya-corriendo" });
  if (Date.now() - ultimoInicio < 150_000) return Response.json({ estado: "iniciando" });

  const uvicorn = path.join(RAIZ, ".venv", "bin", "uvicorn");
  const rutaToken = path.join(homedir(), ".config", "tabpfn", "token");
  if (!existsSync(uvicorn)) {
    return Response.json({ estado: "error", detalle: "No encuentro .venv/bin/uvicorn en la carpeta del proyecto." }, { status: 500 });
  }
  if (!existsSync(rutaToken)) {
    return Response.json({ estado: "error", detalle: "Falta la API Key de TabPFN en ~/.config/tabpfn/token." }, { status: 500 });
  }

  const log = path.join(tmpdir(), "simulador_api_g14.log");
  const salida = openSync(log, "a");
  const hijo = spawn(uvicorn, ["simulador.api.main:app", "--host", "127.0.0.1", "--port", "8014"], {
    cwd: RAIZ,
    env: { ...process.env, TABPFN_TOKEN: readFileSync(rutaToken, "utf8").trim() },
    detached: true,
    stdio: ["ignore", salida, salida],
  });
  hijo.unref();
  ultimoInicio = Date.now();
  return Response.json({ estado: "iniciando", log });
}
