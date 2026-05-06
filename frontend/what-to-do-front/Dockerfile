# Use apenas a imagem base com Node.js/npm
FROM node:20-alpine AS builder
# Define o diretório de trabalho, que é mapeado para seu código local via volume
WORKDIR /app

# Copia os arquivos de configuração de dependências
COPY package.json . 
COPY package-lock.json .

# Instala as dependências
RUN npm install

COPY .env.production .
# Copia o restante do código-fonte (Isso é redundante com o volume, mas é boa prática no Dockerfile)
COPY src ./src
COPY vite.config.ts .
COPY tsconfig.json .
COPY tsconfig.app.json .
COPY tsconfig.node.json .
COPY public ./public
COPY index.html .
# CRÍTICO: Executa o comando de build do Vite. Isso gera os arquivos estáticos na pasta 'dist' (ou similar)
#
RUN npm run build
# O CMD é o comando padrão, mas será sobrescrito pelo docker-compose.yml
#CMD ["npm", "run", "dev"]

FROM nginx:alpine AS production

# CRÍTICO: Mapear a porta 80 do Nginx para a porta 8080 no Cloud Run
# O Nginx escuta na porta 80, o Cloud Run encaminha o tráfego externo para ela.
EXPOSE 80

# Remove o arquivo de configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# ⬇️ NOVO ARQUIVO: Copia um arquivo de configuração customizado do Nginx
# Precisamos criar este arquivo para configurar a porta 8080 e o proxy para o Backend.
COPY nginx.template /etc/nginx/conf.d/default.conf.template

# CRÍTICO: Copia os arquivos estáticos (HTML/CSS/JS) gerados na etapa 'builder'
# ⬇️ ASSUMIMOS que a pasta de build é 'dist'
COPY --from=builder /app/dist /usr/share/nginx/html

# Inicia o Nginx (comando padrão)
CMD ["/bin/sh", "-c", "envsubst '$API_BASE_URL $PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]