#!/bin/sh

export PORT=${PORT:-8080}

echo "Starting NestJS on port $PORT"

exec node dist/main.js
