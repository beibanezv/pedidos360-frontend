# Pedidos360 frontend — imagen para EC2 (4ª máquina, puerto 80)
# Build: npm ci + ng build (usa environment.prod.ts por defecto).
# Antes de buildear en EC2: deja environment.prod.ts con la invoke URL
# real del Gateway y la URL https como redirectUri (ver docs/aws-setup.md).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/pedidos360-frontend /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
