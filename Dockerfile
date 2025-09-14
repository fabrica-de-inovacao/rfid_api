# Use uma imagem base oficial do Node.js. Recomendo usar uma versão LTS (Long Term Support).
FROM node:18-alpine

# Crie e defina o diretório de trabalho dentro do contêiner.
WORKDIR /usr/src/app

# Copie o package.json e o yarn.lock para o diretório de trabalho.
# O uso de wildcards (*) garante que ambos os arquivos sejam copiados se existirem.
COPY package.json yarn.lock ./

# Instale as dependências do projeto.
# O --frozen-lockfile garante que as versões exatas do yarn.lock sejam usadas.
RUN yarn install --frozen-lockfile

# Copie o restante dos arquivos da aplicação para o diretório de trabalho.
# O .dockerignore garantirá que arquivos desnecessários não sejam copiados.
COPY . .

# Compile o código TypeScript para JavaScript.
RUN yarn build

# Exponha a porta em que a aplicação será executada.
EXPOSE 9000

# Defina o comando para iniciar a aplicação.
CMD ["node", "dist/index.js"]
