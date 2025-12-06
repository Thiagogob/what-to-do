# 1. ETAPA DE BUILD (Para compilar o código NestJS)
FROM node:20-alpine AS builder

# Define o diretório de trabalho na raiz do seu projeto (onde o código é copiado)
WORKDIR /usr/src/app 

# 1.1 COPIAR ARQUIVOS DE DEPENDÊNCIA
# Copia apenas os arquivos de configuração (package.json, etc.) da pasta /backend
# Assumindo que este Dockerfile está em /backend
COPY package.json .
COPY package-lock.json .
COPY nest-cli.json . 
COPY tsconfig.json .
# Se você tiver tsconfig.build.json, copie-o também
COPY tsconfig.build.json . 

# 1.2 Instalar dependências
RUN npm install

# 1.3 COPIAR CÓDIGO FONTE (A pasta 'src' do backend)
# Copia o código fonte do backend para a raiz do WORKDIR
# Se você usa /backend/src, o destino é /usr/src/app/src
COPY src src

# 1.4 BUILD: Compilar o projeto backend
# O comando nest build precisa do nome do projeto, como configurado no seu package.json
# Certifique-se de que o script 'build' no package.json chama 'nest build backend'
RUN npm run build 

# -------------------------------------------------------------

# 2. ETAPA DE PRODUÇÃO (Imagem leve para rodar o código compilado)
# Use a imagem Alpine de Node, que é mais leve
FROM node:20-alpine AS production

# Define o diretório de trabalho
WORKDIR /usr/src/app

# 2.1 Instalar dependências de produção (menos que na etapa de build)
# Copia o package.json de volta e instala apenas o que é necessário para o runtime
COPY package.json .
RUN npm install --omit=dev 

# 2.2 Copiar o CÓDIGO COMPILADO da etapa 'builder'
# A pasta 'dist' é gerada pelo 'nest build'
COPY --from=builder /usr/src/app/dist dist

# 2.3 Copiar quaisquer outros arquivos de runtime
# Se você precisar de arquivos .env, .yaml, etc., copie-os aqui

# 3. COMANDO DE INICIALIZAÇÃO
# Define a porta que o NestJS estará ouvindo
EXPOSE 3005

# O comando final para rodar o código compilado
CMD ["node", "dist/apps/backend/main.js"]