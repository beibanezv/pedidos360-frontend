# Evaluación 3 · Demo Pedidos360

Desde el catálogo, abre una ficha con sesión iniciada. Productos registra el detalle consultado; Analytics recomienda artículos disponibles de esa categoría que todavía no has visto. En **Mis órdenes**, abre **Pago de prueba** para elegir una tarjeta simulada. La cuenta Admin de Entra puede abrir **Mi cuenta → Métricas en vivo** cuando se haya configurado el WebSocket.

## Preparación local

1. En `pedidos360-ms-admin/docker/kafka-cluster`, ejecuta `docker compose up -d` y `./comprobar.ps1 -EnVivo`. Kafka UI: `http://127.0.0.1:8091`. Para demostrar tolerancia a perder un broker, agrega `-ConCaida` (solo prueba con un tópico temporal).
2. Arranca RabbitMQ y servicios anteriores como en la evaluación previa. Para Productos y Carrito, activa `KAFKA_ENABLED=true` y configura `KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092,127.0.0.1:9093,127.0.0.1:9094`.
3. Arranca `ms-pagos` (8089) y `ms-analytics-recommendations` (8090) con sus bases Postgres; la guía de cada repo indica las variables. Pagos requiere Orders (8084); Analytics requiere Productos (8081). El clúster Kafka no usa RabbitMQ ni lo reemplaza.
4. Ejecuta `npm ci` y `npm start`. Inicia sesión en `http://localhost:4200` con una cuenta autorizada.

## Verificación del navegador

```powershell
python -m pip install playwright
python -m playwright install chromium
# Con npm start ejecutándose en otra terminal:
python docs/comprobar-ui-ep5.py
```

Ese script usa Chromium real a 390 y 1280 px pero simula las respuestas HTTP y la sesión. Demuestra interacción, foco, visualización de recomendaciones y del bloqueo; **no** demuestra identidad real, antifraude real ni un despliegue AWS.

En producción `apiUrl` apunta al stage HTTPS de negocio. Habilita `metricasWsUrl` solo cuando haya un origen WSS que conecte con el handler y el origen del frontend esté autorizado en Analytics.
