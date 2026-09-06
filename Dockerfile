# Pedidos360 frontend — imagen para EC2 (4ª máquina, puerto 80)
# Build: npm ci + ng build (usa environment.prod.ts por defecto).
# Antes de buildear en EC2: deja environment.prod.ts con la invoke URL
# real del Gateway y la URL https como redirectUri (ver docs/aws-setup.md).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# SIMPLIFICADO: según versión/config el builder deja la app en dist/.../browser
# (con prerender) o directo en dist/... ; se normaliza para que nginx sirva siempre
# desde la raíz. El baseHref /desarrollo/ (solo config production en angular.json)
# es porque en AWS la app vive detrás del stage "desarrollo" del Gateway: sin esto
# el router y los assets absolutos apuntarían fuera del stage y darían Not Found.
# El `ng serve` local usa la config development y no se ve afectado.
RUN npm run build && \
  if [ -d /app/dist/pedidos360-frontend/browser ]; then \
    cp -r /app/dist/pedidos360-frontend/browser/* /app/dist/pedidos360-frontend/ && \
    rm -rf /app/dist/pedidos360-frontend/browser /app/dist/pedidos360-frontend/prerendered-routes.json; \
  fi && rm -f /app/dist/pedidos360-frontend/50x.html

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/pedidos360-frontend /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
