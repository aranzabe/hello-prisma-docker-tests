# Dockerfile
FROM node:24-bullseye

# Activar Corepack para usar Yarn 4
RUN corepack enable
RUN corepack prepare yarn@4.12.0 --activate

WORKDIR /app

# Copiamos package.json y yarn.lock primero
COPY package.json yarn.lock ./

# Instalamos la última versión de Yarn. Esto es importante para asegurarnos de que estamos usando Yarn 4, ya que la imagen base podría venir con una versión anterior.
RUN yarn set version stable

# Instalamos dependencias con Yarn 4
RUN yarn install

# Copiamos el resto del proyecto
COPY . .

# Generamos clientes Prisma
RUN yarn prisma generate

# Exponemos el puerto
EXPOSE 3000

# Comando por defecto (dev)
CMD ["sh", "-c", "yarn prisma generate && yarn prisma migrate dev && yarn start:dev"]
