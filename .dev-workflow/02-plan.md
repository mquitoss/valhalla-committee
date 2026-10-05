# Plan: Workers Static Assets y Workers Builds

STATUS: READY

## Estrategia

El trabajo se divide en dos hitos verificables. El primero contiene únicamente cambios versionados y sus gates locales; debe quedar revisado y `APPROVED` antes de iniciar el segundo. El segundo contiene exclusivamente la configuración externa e interactiva de Cloudflare/GitHub y puede quedar `BLOCKED` sin invalidar el resultado versionado si faltan autenticación, permisos o confirmación del destino.

No se instalarán dependencias, ejecutarán builds, harán commits ni despliegues durante esta fase de planificación.

## m1-configure-static-assets

### Goal

Configurar el repositorio como Worker assets-only reproducible con Wrangler `4.147.0`, conservar Vite como flujo de desarrollo rápido y validar localmente configuración, build y preparación de despliegue sin publicar.

### Scope

- **Cambios versionados:**
  - Confirmar primero en el registro npm que existe exactamente `wrangler@4.147.0`; esta comprobación es un gate previo a cualquier instalación.
  - Añadir Wrangler como `devDependency` exacta y regenerar coherentemente el lockfile mediante npm, sin actualizar innecesariamente otras dependencias directas.
  - Crear `wrangler.jsonc` con schema local, nombre `valhalla-committee`, `compatibility_date` `2026-10-05` y `assets.directory` `./dist`, sin `main`, IDs, secretos, rutas ni bindings.
  - Mantener `dev`, `build` y `check`; añadir `dev:worker`, reemplazar `preview` por la previsualización del build con `wrangler dev`, y añadir `deploy` y `preview:deploy` según la especificación.
- **Fuera del hito:** no cambiar código/contenido de la landing, no versionar `dist/`, no autenticar Cloudflare y no publicar ni conectar GitHub.

### Expected files or areas

- `package.json`
- `package-lock.json`
- `wrangler.jsonc` (nuevo)
- Sólo como áreas de comprobación, sin cambios esperados: `.gitignore`, `index.html`, `src/**`, `docs/product/**`, `.env*` y `dist/`.

### Dependencies

- Especificación `.dev-workflow/01-spec.md` en estado `READY`.
- Node.js `>=22.12.0`, npm y acceso de lectura al registro npm.
- Gate obligatorio, antes de instalar: `npm view wrangler@4.147.0 version --json` debe devolver exactamente `"4.147.0"`. Si no existe o no puede confirmarse por un fallo persistente del registro/red, detener el hito como `BLOCKED`; no elegir otra versión ni editar manifest/lockfile por aproximación.
- Tras superar el gate, la instalación prevista es `npm install --save-dev --save-exact wrangler@4.147.0`.

### Tests

- El test-writer debe documentar primero una matriz de checks declarativos/smoke, sin añadir un framework: pin manifest/lockfile, campos permitidos/prohibidos de Wrangler, scripts esperados, creación de `dist/index.html`, dry-run assets-only y respuesta HTTP de `/`.
- Comprobar por inspección que `package.json` fija `4.147.0`, el lockfile resuelve la misma versión y los scripts invocan los comandos acordados.
- Arrancar de forma acotada `npm run dev:worker -- --port 8787` y `npm run preview -- --port 8787`, solicitar `/` con `curl --fail http://127.0.0.1:8787/` y cerrar cada proceso; ambos deben servir la landing compilada.
- No añadir Vitest, Playwright ni otra dependencia de test.

### Quality commands

Ejecutar en este orden durante implementación, no durante planificación:

```sh
node --version
npm view wrangler@4.147.0 version --json
npm ci
npm run check
npm run build
test -f dist/index.html
npm run deploy -- --dry-run
git diff --check
git status --short
git diff -- package.json package-lock.json wrangler.jsonc
```

Además de los comandos anteriores, ejecutar los dos smoke checks HTTP descritos en **Tests**. No ejecutar `npm run deploy` ni `npm run preview:deploy` sin un modo no publicador durante este hito. Tras calidad, el spec-reviewer debe comprobar los criterios aplicables y emitir `APPROVED` antes de continuar.

### Acceptance focus

- Criterios 1-7 de la especificación: pin exacto y lockfile coherente, Worker assets-only gobernado por un único `wrangler.jsonc`, scripts correctos, type-check/build, dry-run y previews locales funcionales.
- El diff queda limitado a los tres archivos previstos; no cambia la landing, exclusiones, documentación de producto ni secretos.
- `dist/` continúa ignorado y no hay publicación real.

### Risks

- La versión solicitada podría no existir en npm pese a la información de la especificación; el gate evita producir un lockfile inválido.
- `npm install` podría mover resoluciones transitivas; se debe revisar el diff del lockfile y rechazar cambios no explicados.
- Los procesos `wrangler dev` son persistentes; los smoke checks deben controlar puerto, readiness y terminación para no dejar procesos activos.
- Un error de argumentos podría convertir un dry-run en publicación; usar exclusivamente `npm run deploy -- --dry-run` y revisar su salida.

### Assumptions

- npm sigue siendo el gestor de paquetes autoritativo y el lockfile actual es compatible con la versión instalada de npm.
- Wrangler `dev` acepta el puerto reenviado después de `--` y sirve `assets.directory` tras compilar.
- No hace falta modificar `README.md` para satisfacer el alcance versionado definido por la especificación.

### Decisions & Alternatives Considered

- **Gate del registro antes de instalar**
  - Chosen: consultar `npm view wrangler@4.147.0 version --json`, exigir coincidencia exacta y bloquear si no se confirma.
  - Alternatives considered: confiar en la especificación, instalar `latest` o seleccionar otra versión v4.
  - Why: evita una instalación especulativa y preserva el pin solicitado.
- **Validación proporcional**
  - Chosen: reutilizar type-check/build, dry-run y smoke checks de proceso/HTTP.
  - Alternatives considered: incorporar un framework de tests o publicar temporalmente.
  - Why: el cambio es declarativo y puede verificarse sin nuevas dependencias ni efectos remotos.
- **Documentación del repositorio**
  - Chosen: limitar el diff a manifest, lockfile y configuración Wrangler.
  - Alternatives considered: actualizar también `README.md`.
  - Why: la especificación exige un diff mínimo y no solicita documentación de uso adicional.

## m2-connect-workers-builds

### Goal

Conectar de forma interactiva el repositorio GitHub con Workers Builds, configurar producción en `main` y previews en las demás ramas, y obtener evidencia remota sólo si la autenticación, permisos y confirmaciones del titular lo permiten.

### Scope

- **Paso externo interactivo; sin cambios versionados:**
  - Confirmar con el titular la cuenta Cloudflare y si un Worker existente llamado `valhalla-committee` es el destino correcto.
  - Desde el dashboard de Cloudflare, autorizar la aplicación oficial **Cloudflare Workers and Pages** y limitarla a `mquitoss/valhalla-committee` cuando GitHub lo permita.
  - Conectar el Worker definido por el repositorio y configurar raíz del repositorio, rama `main`, build `npm run build`, deploy `npm run deploy`, previews para ramas distintas de `main` y preview command `npm run preview:deploy`.
  - Usar el token administrado por Workers Builds o uno seleccionado por el titular en el dashboard, sin copiar credenciales a archivos, Git o reportes.
  - Observar una ejecución de producción y otra de una rama no `main` únicamente con autorización explícita para provocar esos builds; no crear/push de ramas, commits ni despliegues desde la sesión de implementación.
- Si la sesión interactiva, los permisos, la cuenta o la autorización para activar builds no están disponibles, registrar el hito como `BLOCKED` con instrucciones de reanudación y detenerse sin intentar APIs no documentadas.

### Expected files or areas

- Estado externo: dashboard de Cloudflare Workers Builds y configuración de la GitHub App.
- Evidencia permitida en `.dev-workflow/milestones/m2-connect-workers-builds/`, redactada para excluir tokens, cookies, IDs sensibles y logs completos con posibles secretos.
- No se esperan cambios en `package.json`, `package-lock.json`, `wrangler.jsonc` ni en código fuente.

### Dependencies

- `m1-configure-static-assets` con calidad satisfactoria y revisión `APPROVED`.
- Configuración versionada disponible en GitHub; como este encargo no autoriza commit/push, si aún no está publicada el hito debe esperar a que el titular la publique por separado.
- Sesión autenticada con permisos suficientes en Cloudflare y GitHub.
- Confirmación del titular sobre cuenta, Worker de destino y efecto de conectar `main` a producción.

### Tests

- Verificar en el dashboard todos los campos de configuración contra los criterios 8 y 11, sin capturar credenciales.
- Verificar una ejecución asociada a `main`: build correcto, despliegue de producción correcto y `/` sirviendo la landing.
- Verificar una ejecución de rama no `main`: usa `wrangler preview`, no promociona producción y entrega una Preview URL aislada.
- Revisar que el acceso de la GitHub App sea mínimo y que repositorio, configuración pública y evidencia no contengan tokens.

### Quality commands

Antes de la interacción, repetir únicamente checks locales no publicadores si se necesita confirmar el artefacto:

```sh
npm ci
npm run check
npm run build
npm run deploy -- --dry-run
git status --short
```

La calidad remota se verifica en el dashboard mediante los dos builds y peticiones HTTP a sus URLs. No ejecutar manualmente `npm run deploy` o `npm run preview:deploy`, ni usar Wrangler para desplegar desde local. Después, quality-check y spec-reviewer deben evaluar la evidencia; sólo `APPROVED` completa el hito.

### Acceptance focus

- Criterios 8-11 de la especificación: integración GitHub correcta, `main` como única producción, previews aisladas para otras ramas, acceso mínimo y ausencia de secretos.
- Separación estricta entre estado externo y el diff ya aprobado en `m1`.
- Un bloqueo de autenticación se informa con precisión; nunca se presenta la conexión como completada sin evidencia.

### Risks

- La autorización exige UI, MFA o aprobación de una organización que el agente puede no completar.
- Conectar `main` puede iniciar una publicación real; requiere confirmación explícita del titular y configuración revisada.
- Un Worker homónimo podría ser un recurso existente que no debe reemplazarse.
- Worker Previews podría exigir una migración irreversible; no aceptarla sin aprobación del titular.
- Los checks/comentarios de GitHub o logs de build pueden exponer metadatos; guardar sólo evidencia mínima y redactada.

### Assumptions

- El remoto `mquitoss/valhalla-committee` y la rama `main` siguen siendo los objetivos correctos.
- El titular realizará o supervisará autenticación, MFA, selección de cuenta y cualquier acción remota con efecto de despliegue.
- La configuración aprobada en `m1` llegará a GitHub mediante un flujo de commit/push separado y expresamente autorizado.

### Decisions & Alternatives Considered

- **Integración alojada**
  - Chosen: GitHub App oficial configurada desde Workers Builds.
  - Alternatives considered: GitHub Actions con token, deploy local o API no documentada.
  - Why: coincide con el alcance solicitado y mantiene las credenciales fuera del repositorio.
- **Tratamiento de autenticación insuficiente**
  - Chosen: marcar `BLOCKED`, conservar el hito reanudable y no simular evidencia.
  - Alternatives considered: omitir validación remota o sustituirla por un deploy local.
  - Why: la conexión y los builds sólo son verificables con permisos y estado remoto reales.
- **Evidencia externa**
  - Chosen: registrar resultados mínimos redactados en el artefacto del hito.
  - Alternatives considered: copiar logs completos o capturas con datos de sesión.
  - Why: permite trazabilidad sin ampliar la exposición de secretos o metadatos sensibles.

## Assumptions

- Los slugs `m1-configure-static-assets` y `m2-connect-workers-builds` quedan establecidos y deben reutilizarse en reejecuciones.
- Los agentes de implementación, calidad y revisión estarán disponibles; si falta un gate independiente, se informará la limitación en vez de sustituirlo silenciosamente por autorrevisión.
- No existe una instrucción de repositorio adicional que contradiga la especificación o las convenciones leídas.

## Decisions & Alternatives Considered

- **Dos hitos por frontera de efectos**
  - Chosen: separar cambios versionados/validación local de autenticación y estado remoto.
  - Alternatives considered: un único hito end-to-end o tres hitos separados para configuración, validación e integración.
  - Why: ofrece dos unidades verificables, mantiene pequeños los hitos y hace explícito que el segundo puede bloquearse sin contaminar el primero.
- **Orden de gates**
  - Chosen: test plan, implementación, calidad y revisión para `m1`; sólo después interacción, calidad remota y revisión para `m2`.
  - Alternatives considered: conectar GitHub antes de validar localmente o ejecutar ambos hitos en paralelo.
  - Why: reduce el riesgo de que Workers Builds publique una configuración no revisada.
