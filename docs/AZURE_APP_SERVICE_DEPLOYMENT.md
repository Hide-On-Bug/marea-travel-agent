# Despliegue en Azure App Service

> Guia operativa definitiva: ver [DEPLOY_APP_SERVICE_RUNBOOK.md](DEPLOY_APP_SERVICE_RUNBOOK.md).

## Prerrequisitos

- Visual Studio Code con la extensión **Azure App Service** instalada
- Azure App Service con runtime **Node.js 20 LTS** (Linux)
- `package.json` en la raíz del workspace

---

## 1. Variables de entorno en Azure Portal

Antes del primer despliegue, configura las siguientes App Settings en:

**App Service → Settings → Environment variables**

| Variable | Valor |
|---|---|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
| `NODE_ENV` | `production` |
| `COPILOT_TOKEN_ENDPOINT` | *(URL del endpoint del token de Copilot Studio — configurar manualmente)* |
| `NEXT_PUBLIC_AGENT_TRANSPORT` | `directline` |
| `NEXT_PUBLIC_DIRECT_LINE_DOMAIN` | `https://europe.directline.botframework.com/v3/directline` |

> **Importante:** Las variables `NEXT_PUBLIC_*` se incorporan al bundle JavaScript durante el build. Si las cambias en Azure, debes hacer un nuevo despliegue para que el cambio tenga efecto.

Tras añadir todas las variables → **Save** → confirmar.

---

## 2. Startup Command

**App Service → Settings → Configuration → General settings**

```
npm start
```

→ **Save** → **Restart**.

---

## 3. Despliegue desde VS Code

1. Abre VS Code en la carpeta raíz del proyecto (donde está `package.json`).
2. En la barra lateral de Azure, expande **App Services**.
3. Haz clic derecho sobre la Web App de destino.
4. Selecciona **Deploy to Web App…**
5. Cuando se pregunte por la carpeta, selecciona la **raíz del workspace** (la que contiene `package.json`).
6. Confirma el despliegue.

El ZIP que VS Code envía excluye automáticamente (configurado en `.vscode/settings.json`):
- `node_modules/`
- `.next/`
- `.git/`
- `.vscode/`
- `.env`, `.env.local`
- `coverage/`, logs

Incluye todo lo necesario para que Oryx ejecute `npm ci && npm run build`.

---

## 4. Qué hace Azure al recibir el ZIP

Con `SCM_DO_BUILD_DURING_DEPLOYMENT=true`, Oryx ejecuta automáticamente:

```bash
npm ci                  # instala dependencias desde package-lock.json
npm run build           # next build — genera .next/
```

Luego la aplicación arranca con el Startup Command:

```bash
npm start               # next start — sirve desde .next/
```

---

## 5. Verificación tras el despliegue

### 5.1 Comprobar que la app arranca

```
GET https://<tu-app>.azurewebsites.net/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "runtime": "node",
  "copilotTokenEndpointConfigured": true,
  "agentTransport": "directline",
  "directLineDomainConfigured": true
}
```

Si `copilotTokenEndpointConfigured` es `false`, la variable `COPILOT_TOKEN_ENDPOINT` no está configurada en Azure.

### 5.2 Si la aplicación no arranca

1. Ve a **App Service → Monitoring → Log stream**.
2. Busca errores de Node.js o de build de Oryx.
3. Verifica que `SCM_DO_BUILD_DURING_DEPLOYMENT=true` está configurado.
4. Verifica que el Startup Command es `npm start`.
5. Vuelve a desplegar desde VS Code si es necesario.

---

## 6. Seguridad

- `COPILOT_TOKEN_ENDPOINT` **nunca** se expone al navegador. Solo la usa la ruta server-side `/api/copilot/token`.
- `.env.local` está en `.gitignore` y no se sube al repositorio.
- El endpoint `/api/health` no devuelve secretos, tokens ni el valor de `COPILOT_TOKEN_ENDPOINT`.

---

## 7. Referencia de archivos relevantes

| Archivo | Propósito |
|---|---|
| `package.json` | Scripts de build y arranque |
| `next.config.ts` | Configuración de Next.js (sin output estático) |
| `.deployment` | Referencia Kudu (Oryx auto-detecta Node.js) |
| `.vscode/settings.json` | `zipIgnorePattern` para el despliegue desde VS Code |
| `.env.example` | Plantilla de variables de entorno |
| `app/api/health/route.ts` | Endpoint de diagnóstico |
| `app/api/copilot/token/route.ts` | Endpoint server-side del token de Direct Line |
