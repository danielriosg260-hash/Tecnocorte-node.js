#!/usr/bin/env bash
# Guarda la fecha y hora cada vez que se ejecuta el script.
# Se programa con crontab; los pasos están explicados en el README.

CARPETA="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVO="$CARPETA/logs/backup-cron.log"

mkdir -p "$CARPETA/logs"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Ejecución del cron de backup" >> "$ARCHIVO"
