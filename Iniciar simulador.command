#!/bin/bash
# Doble clic en Finder: inicia la API de TabPFN y el simulador, y abre el navegador cuando está listo.
# Para cerrar todo: Ctrl+C en esta ventana de Terminal (o cerrarla).
cd "$(dirname "$0")" || exit 1
( until curl -s -o /dev/null http://127.0.0.1:3014/; do sleep 3; done; open http://localhost:3014 ) &
exec simulador/iniciar.sh
