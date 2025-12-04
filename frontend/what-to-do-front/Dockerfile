# Use apenas a imagem base com Node.js/npm
FROM node:20 as build 

# Define o diretório de trabalho, que é mapeado para seu código local via volume
WORKDIR /app

# Copia os arquivos de configuração de dependências
COPY package.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código-fonte (Isso é redundante com o volume, mas é boa prática no Dockerfile)
COPY . .
# O CMD é o comando padrão, mas será sobrescrito pelo docker-compose.yml
CMD ["npm", "run", "dev"]