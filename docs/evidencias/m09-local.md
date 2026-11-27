# M09 — Evidencia local de Kafka (2026-11-27)

> **Evidencia LOCAL**, generada con Docker Desktop en la máquina de Matías. No sustituye la
> evidencia cloud de C1: esa sigue pendiente de una sesión de Learner Lab vigente.
> Sin credenciales, tokens ni datos personales en este archivo.

## Comandos ejecutados

Desde `pedidos360-ms-admin/docker/kafka-cluster`:

```powershell
docker compose up -d
docker compose exec -T broker1 kafka-topics --bootstrap-server broker1:29092,broker2:29092,broker3:29092 `
  --create --topic p360.demo.defensa.interacciones --partitions 3 --replication-factor 3 `
  --config min.insync.replicas=2 --config cleanup.policy=delete
docker compose exec -T broker1 kafka-topics --bootstrap-server broker1:29092,broker2:29092,broker3:29092 `
  --create --topic p360.demo.defensa.pagos --partitions 3 --replication-factor 3 `
  --config min.insync.replicas=2 --config cleanup.policy=delete
.\\comprobar.ps1 -EnVivo
.\\comprobar.ps1 -EnVivo -ConCaida
```

Kafka UI quedó en modo solo lectura (`KAFKA_UI_READ_ONLY=true`): los tópicos demo se crearon por CLI.

## Salida relevante (`-EnVivo`)

```
Compose: 3 ZooKeepers, 3 brokers y Kafka UI
Topic: p360.interacciones.v1  PartitionCount: 3  ReplicationFactor: 3
  Configs: min.insync.replicas=2,cleanup.policy=delete,retention.ms=604800000
  Isr: 1,3,2 | Isr: 2,1,3 | Isr: 3,2,1
Topic: p360.pagos.v1  PartitionCount: 3  ReplicationFactor: 3
  Configs: min.insync.replicas=2,cleanup.policy=delete,retention.ms=2592000000
  Isr: 2,3,1 | Isr: 3,1,2 | Isr: 1,2,3
Kafka UI: reporta 3 brokers
```

Retenciones: interacciones 7 días (`604800000` ms), pagos 30 días (`2592000000` ms).

## Tópicos demo del guion (creados por CLI)

```
Topic: p360.demo.defensa.interacciones  PartitionCount: 3  ReplicationFactor: 3
  Configs: min.insync.replicas=2,cleanup.policy=delete
Topic: p360.demo.defensa.pagos  PartitionCount: 3  ReplicationFactor: 3
  Configs: min.insync.replicas=2,cleanup.policy=delete
```

## Salida relevante (`-ConCaida`)

```
Tolerancia: ISR 2, escritura acks=all y lectura correctas
```

El script detuvo `broker3`, esperó a ISR 2, produjo con `acks=all`, leyó el mensaje y restauró
`broker3` en el bloque `finally`. Estado final: los tres brokers `healthy`.

## Ajustes al comprobador

`comprobar.ps1` necesitó dos cambios mínimos para PowerShell 5.1 / Docker en esta máquina:

1. `$ErrorActionPreference = 'Continue'`: PowerShell 5.1 convierte el stderr de `docker compose`
   en errores terminantes con `Stop`; los fallos reales se siguen comprobando con `$LASTEXITCODE`.
2. Timeout del consumidor de 10 s a 30 s: con un broker detenido, la reelección de líder tarda
   más y el consumidor daba `TimeoutException` antes de leer.

Cambios en la rama `fix/matias-M09-comprobador` de `pedidos360-ms-admin`, sin merge a `main`.

## Pendiente

Ejecutar la misma matriz en el clúster de C1 cuando haya sesión de lab vigente y archivar esa
salida como evidencia cloud. Esta página solo acredita la demostración local.
