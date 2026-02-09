# Dockerfile
FROM node:24-bullseye

# Activar Corepack para usar Yarn 4
RUN corepack enable
RUN corepack prepare yarn@4.12.0 --activate

WORKDIR /app

# Copiamos package.json y yarn.lock primero
COPY package.json yarn.lock ./

# Instalamos dependencias con Yarn 4
RUN yarn set version stable

# Copiamos el resto del proyecto
COPY . .

# Generamos clientes Prisma
RUN yarn prisma generate

# Exponemos el puerto
EXPOSE 3000

# Comando por defecto (dev)
CMD ["sh", "-c", "yarn prisma generate && yarn prisma migrate dev && yarn start:dev"]
