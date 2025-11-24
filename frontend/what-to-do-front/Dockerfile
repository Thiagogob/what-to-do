# 1. ETAPA DE BUILD (Vite)
FROM node:20-alpine as build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# O comando é o mesmo, mas gera a pasta '/dist'
RUN npm run build 

# 2. ETAPA DE SERVIÇO (Nginx)
FROM nginx:alpine
# ALTERAÇÃO AQUI: Copia os arquivos gerados do /dist para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html 
# Nginx expõe a porta 80
EXPOSE 80