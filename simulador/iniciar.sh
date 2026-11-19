#!/usr/bin/env bash
# Inicia el simulador completo en el Mac: API (TabPFN) + frontend.
# Uso, desde la carpeta del proyecto:   simulador/iniciar.sh            (frontend Next.js en http://localhost:3014)
#                                       simulador/iniciar.sh streamlit  (además, Streamlit en http://localhost:8501)
# La API Key de TabPFN se lee de ~/.config/tabpfn/token y solo vive en la variable de entorno del proceso.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f ~/.config/tabpfn/token ]]; then
  echo "Falta ~/.config/tabpfn/token (la API Key de Prior Labs)." >&2
  exit 1
fi

TABPFN_TOKEN="$(cat ~/.config/tabpfn/token)" .venv/bin/uvicorn simulador.api.main:app --host 127.0.0.1 --port 8014 &
API_PID=$!
trap 'kill $API_PID ${WEB_PID:-} ${ST_PID:-} 2>/dev/null' EXIT

echo "Cargando TabPFN (~1,5 min)..."
until curl -s http://127.0.0.1:8014/api/salud | grep -q '"listo":true'; do
  if curl -s http://127.0.0.1:8014/api/salud | grep -q '"error":"'; then
    curl -s http://127.0.0.1:8014/api/salud; echo; exit 1
  fi
  sleep 3
done
echo "API lista: $(curl -s http://127.0.0.1:8014/api/salud)"

cd simulador/web
[[ -d node_modules ]] || npm ci
# Recompila si no hay build o si cambió algún archivo del frontend después del último build
if [[ ! -f .next/BUILD_ID ]] || [[ -n "$(find app components lib next.config.ts package.json -newer .next/BUILD_ID -type f 2>/dev/null | head -1)" ]]; then
  echo "Compilando el frontend..."
  # Next.js a veces detiene el primer build para mostrar un aviso de actualización; el segundo intento continúa
  npm run build || npm run build
fi
npm run start -- -p 3014 -H 127.0.0.1 &
WEB_PID=$!
cd ../..

if [[ "${1:-}" == "streamlit" ]]; then
  .venv/bin/streamlit run simulador/app_streamlit.py --server.port 8501 &
  ST_PID=$!
fi

echo "Simulador en http://localhost:3014  (Ctrl+C para cerrar)"
wait
