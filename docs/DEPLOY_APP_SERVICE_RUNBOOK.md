# Runbook Definitivo de Despliegue a Azure App Service

Este documento define el proceso obligatorio para desplegar este proyecto en Azure App Service sin caer en ciclos de intento y error.

## Objetivo

- Publicar la app de forma controlada.
- Evitar conflictos Kudu/SCM por operaciones paralelas.
- Cerrar siempre con verificacion funcional (`/api/health`).

## Alcance

- Proyecto: Marea (Next.js App Router)
- Entorno: Azure App Service Linux, Node 22 LTS
- Metodo recomendado: ZIP Deploy con `config-zip`

## Variables que deben estar definidas

- `RESOURCE_GROUP`
- `APP_SERVICE_NAME`
- `APP_URL_PUBLICA` (ejemplo: `https://<app>.azurewebsites.net`)
- `SUBSCRIPTION_ID` (o nombre de suscripcion)
- `TOKEN_ENDPOINT` (si aplica)
- `DIRECT_LINE_SECRET` (si aplica)

## Reglas Innegociables

1. No ejecutar `restart` durante el despliegue.
2. No cambiar App Settings mientras el despliegue este en curso.
3. No cambiar Startup Command mientras el despliegue este en curso.
4. Si hay cambios de configuracion, aplicarlos antes del deploy y esperar 90-120 segundos.
5. Si aparece timeout/504, no asumir fallo inmediato: verificar estado real del deployment en Kudu antes de reintentar.
6. Nunca lanzar un segundo deploy si el anterior sigue `in progress`.

## Fase 0: Preparacion de sesion

```bash
az login
az account set --subscription "SUBSCRIPTION_ID"
az account show --output table
```

## Fase 1: Preflight local obligatorio

1. Estar en la raiz del proyecto (debe existir `package.json`).
2. Validar scripts `build` y `start` en `package.json`.
3. Ejecutar build limpio:

```bash
npm ci
npm run build
```

Si falla, se corrige antes de seguir.

## Fase 2: Validacion y configuracion de App Service

### 2.1 Verificar runtime y startup

```bash
az webapp config show \
  --resource-group "RESOURCE_GROUP" \
  --name "APP_SERVICE_NAME" \
  --query "{linuxFxVersion:linuxFxVersion,appCommandLine:appCommandLine}" \
  -o json
```

Esperado:

- `linuxFxVersion`: `NODE|22-lts`
- Startup Command para modo source: `npm start`

### 2.2 App Settings minimos

```bash
az webapp config appsettings set \
  --resource-group "RESOURCE_GROUP" \
  --name "APP_SERVICE_NAME" \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    NODE_ENV=production \
    NEXT_PUBLIC_AGENT_TRANSPORT=directline \
    NEXT_PUBLIC_DIRECT_LINE_DOMAIN=https://europe.directline.botframework.com/v3/directline
```

Si aplica por integracion:

- `COPILOT_TOKEN_ENDPOINT=TOKEN_ENDPOINT`
- `COPILOT_DIRECTLINE_SECRET=DIRECT_LINE_SECRET`
- `COPILOT_DIRECTLINE_TOKEN_URL=https://europe.directline.botframework.com/v3/directline/tokens/generate`

### 2.3 Startup Command (solo si hay que corregir)

```bash
az webapp config set \
  --resource-group "RESOURCE_GROUP" \
  --name "APP_SERVICE_NAME" \
  --startup-file "npm start"
```

### 2.4 Espera de estabilizacion

Esperar 90-120 segundos antes de desplegar.

## Fase 3: Empaquetado limpio

Generar `deploy.zip` excluyendo secretos y artefactos:

```powershell
$zip = "deploy.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

tar -a -c -f $zip \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=.vscode \
  --exclude=.env \
  --exclude=.env.local \
  --exclude=.env.*.local \
  --exclude=coverage \
  --exclude=webapp-logs \
  --exclude=webapp-logs-latest \
  --exclude=webapp-logs-latest2 \
  --exclude=*.log \
  --exclude=*.zip \
  .

# Verificacion minima del zip
$hasPackage = tar -tf $zip | Select-String -SimpleMatch "package.json" | Select-Object -First 1
$hasApp = tar -tf $zip | Select-String -SimpleMatch "app/page.tsx" | Select-Object -First 1
"contains_package_json=$([bool]$hasPackage)"
"contains_app_page=$([bool]$hasApp)"
```

No continuar si alguna verificacion da `False`.

## Fase 4: Deploy controlado (una sola operacion)

```bash
az webapp deployment source config-zip \
  --resource-group "RESOURCE_GROUP" \
  --name "APP_SERVICE_NAME" \
  --src deploy.zip
```

Durante esta fase:

- No ejecutar `az webapp config ...`
- No ejecutar `az webapp restart`
- No lanzar otro deploy en paralelo

## Fase 5: Manejo de timeout, 502 o 504

Si el cliente CLI devuelve timeout/502/504:

1. Consultar estado real del deployment:

```bash
az webapp log deployment list \
  --resource-group "RESOURCE_GROUP" \
  --name "APP_SERVICE_NAME" \
  --output table
```

2. Si el deployment sigue en progreso, esperar.
3. Si termino en exito, ir a health check.
4. Si termino en fallo, descargar logs y corregir causa raiz antes de reintentar:

```bash
az webapp log download \
  --resource-group "RESOURCE_GROUP" \
  --name "APP_SERVICE_NAME" \
  --log-file post-deploy-logs.zip
```

## Fase 6: Verificacion final obligatoria

```bash
curl "APP_URL_PUBLICA/api/health"
```

Criterio de exito:

- HTTP 200
- JSON con `status: "ok"`
- Sin pantalla "Application Error"

## Causas comunes y accion concreta

### Error: `sh: 1: next: not found`

Significa que el runtime no tiene `node_modules/.bin/next` disponible.

Accion:

1. Revisar que `SCM_DO_BUILD_DURING_DEPLOYMENT=true`.
2. Confirmar `startup-file` en `npm start` para modo source.
3. Repetir desde Fase 3 (nuevo zip limpio).
4. No cambiar configuracion durante el deploy.

### Error: `Deployment stopped due to SCM container restart`

Significa conflicto por operacion de management y despliegue juntos.

Accion:

1. Terminar cualquier deploy activo.
2. Aplicar config.
3. Esperar 90-120 segundos.
4. Lanzar un unico deploy.

## Modo alternativo robusto (solo si source deploy sigue fallando)

Usar paquete standalone de Next.js y startup `node server.js`.

- Requiere `output: "standalone"` en `next.config.ts`.
- Empaquetar `.next/standalone`, `.next/static` y `public/`.
- Cambiar startup a `node server.js` antes del deploy.

Este modo evita depender del build remoto de Oryx.

## Plantilla de reporte de cierre

1. Comandos ejecutados.
2. Variables configuradas (secretos enmascarados).
3. Resultado de `npm ci` y `npm run build`.
4. Resultado del deploy (deployment id y estado final).
5. Resultado de `APP_URL_PUBLICA/api/health`.
6. Incidencias y resolucion.
7. Estado final: `PUBLICADO OK` o `BLOQUEADO`.

---

Ultima actualizacion: 2026-08-04
Responsable: Equipo Marea
