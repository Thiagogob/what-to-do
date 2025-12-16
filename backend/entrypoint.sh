#!/bin/sh
# backend/entrypoint.sh
# -----------------------------------------------------------
# 1. ORQUESTRADOR DE INICIALIZAÇÃO PARA O GOOGLE CLOUD RUN
# -----------------------------------------------------------

# Exemplo: O Cloud Run usa a variável $PORT. Definimos 8080 como fallback,
# embora o Cloud Run garanta que $PORT esteja definido.
export PORT=${PORT:-8080}

echo "Iniciando o Backend NestJS em produção na porta: $PORT"

# --- 2. INICIAR O SERVIDOR NESTJS DE PRODUÇÃO ---
# O servidor NestJS deve escutar na porta $PORT.
# O TypeORM/NestJS agora apenas se conecta ao banco de dados existente.
exec node dist/main.js

# O comando 'exec' garante que o processo 'node' substitua o shell
# como o PID 1 do contêiner, garantindo o gerenciamento correto de sinais.