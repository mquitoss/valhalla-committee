# Especificación: despliegue estático en Cloudflare Workers

STATUS: READY

## Objective

Preparar el repositorio `mquitoss/valhalla-committee` para publicar la salida estática de Vite en Cloudflare Workers Static Assets y definir la conexión de Workers Builds con GitHub, usando `main` como rama de producción y Worker Previews para el resto de ramas.

La solución debe ser reproducible con npm, mantener Wrangler v4 fijado en el lockfile y no alterar el comportamiento ni el código fuente de la landing.

## Scope

### Cambios versionados en el repositorio

- Añadir `wrangler` `4.147.0` como `devDependency` exacta y actualizar `package-lock.json` de forma coherente. Esta es la versión v4 publicada al preparar esta especificación; no se admite un rango (`^` o `~`).
- Añadir `wrangler.jsonc` como fuente de verdad de despliegue, con al menos:
  - `$schema`: `./node_modules/wrangler/config-schema.json`.
  - `name`: `valhalla-committee`.
  - `compatibility_date`: `2026-10-05`.
  - `assets.directory`: `./dist`.
  - Sin `main`, porque es un Worker de solo assets.
- Mantener `npm run build` como productor de `dist/` (`tsc --noEmit && vite build`).
- Mantener `npm run dev` como bucle rápido de desarrollo Vite y añadir comandos explícitos para el flujo Workers:
  - `dev:worker`: compilar y arrancar `wrangler dev` contra `./dist`.
  - `preview`: compilar y arrancar `wrangler dev` para previsualizar localmente el artefacto de producción.
  - `deploy`: ejecutar `wrangler deploy`; en Workers Builds se ejecutará después de su paso de build separado.
  - `preview:deploy`: ejecutar `wrangler preview`; en Workers Builds se ejecutará después de su paso de build separado para ramas no productivas.
- Aplicar comprobaciones de configuración y build con las herramientas ya presentes, sin introducir un framework de tests.

### Configuración externa de Cloudflare

- Conectar mediante la aplicación oficial **Cloudflare Workers and Pages** de GitHub el repositorio alojado `mquitoss/valhalla-committee` al Worker definido por `wrangler.jsonc`.
- Configurar Workers Builds con:
  - Directorio raíz: raíz del repositorio.
  - Rama de producción: `main`.
  - Build command: `npm run build`.
  - Deploy command: `npm run deploy`.
  - Preview builds: habilitadas para toda rama distinta de `main`.
  - Preview command: `npm run preview:deploy`.
- Limitar, cuando GitHub lo permita, el acceso de la GitHub App al repositorio solicitado.
- Usar el token administrado automáticamente por Workers Builds o un token seleccionado por el titular desde el dashboard; nunca copiarlo al repositorio, al archivo Wrangler ni a artefactos de workflow.

## Non-goals

- No modificar `index.html`, `src/main.ts`, `src/style.css`, contenido, estilos, interacciones ni otros archivos fuente de la aplicación.
- No añadir un Worker con lógica JavaScript/TypeScript, SSR, Functions, Pages, Cloudflare Vite plugin, framework de interfaz o backend.
- No configurar dominio personalizado, DNS, rutas, variables de runtime, bindings, analytics collector ni secretos.
- No versionar `dist/`, credenciales, tokens, IDs de cuenta, archivos `.env*` locales ni contenido bajo `docs/product/`.
- No cambiar la rama activa, crear/push de ramas, hacer commits ni modificar documentación de producto.
- No automatizar mediante una API no documentada la autorización de GitHub o la selección de cuenta de Cloudflare.

## Affected System

| Área | Estado actual | Cambio previsto |
| --- | --- | --- |
| Build frontend | Vite 8.3.2 genera `dist/` mediante `npm run build` | Se conserva sin cambios funcionales |
| Type checking | TypeScript 7.0.2, `tsc --noEmit` | Se conserva como gate |
| Package management | npm y `package-lock.json`; Node.js `>=22.12.0` | Wrangler v4 exacto queda resuelto en manifest y lockfile |
| Desarrollo local | `vite` y `vite preview` | Vite sigue como servidor rápido; se añade una previsualización equivalente al runtime de Static Assets con `wrangler dev` |
| Despliegue | No configurado ni publicado | Worker assets-only con `./dist` y comandos Wrangler |
| CI/CD alojado | Remoto `origin` apunta a `mquitoss/valhalla-committee`; `main` sigue `origin/main` | Workers Builds observa `main` para producción y las demás ramas para previews |
| Seguridad/configuración local | `dist/`, `.env*`, `.local/` y `docs/product/` ignorados | Se preservan exclusiones y no se incorporan secretos |

## Detected Languages and Tooling

- TypeScript estricto para interacciones de navegador.
- HTML y CSS para la landing estática.
- JSON/JSONC para npm, TypeScript y Wrangler.
- npm con lockfile, Node.js `>=22.12.0`, Vite 8.3.2 y TypeScript 7.0.2.
- No hay framework de UI ni framework de tests detectado.

## Repository and Product Constraints

- `README.md:3-5` define una web estática de HTML, TypeScript y Vite sin framework ni servicios externos necesarios para mostrarla; la configuración no debe introducir runtime de aplicación.
- `README.md:9-14` y `package.json:6-17` establecen Node.js, npm y los comandos actuales; deben seguir siendo la base del flujo.
- `README.md:22-30` declara que Vite entrega la web lista para servir en `dist/`; Cloudflare debe publicar exactamente ese directorio.
- `README.md:34` advierte que `VITE_*` es público y no debe contener credenciales; ninguna credencial de Cloudflare o GitHub puede tratarse como variable Vite.
- `README.md:69-74` conserva como tareas separadas del alojamiento la creación del buzón, revisión de textos, analítica y dominio; este trabajo no debe decidirlas.
- `.gitignore:2-8` excluye dependencias, build, variables locales, estado local y `docs/product/`; esas protecciones se mantienen.
- Cloudflare recomienda `wrangler.jsonc` como fuente de verdad, permite omitir `main` para Workers de solo assets y documenta `assets` para estáticos: [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) (consultado 2026-10-05).
- Cloudflare documenta `wrangler dev` y `wrangler deploy` para sitios estáticos: [Static Assets — Get Started](https://developers.cloudflare.com/workers/static-assets/get-started/) (consultado 2026-10-05).
- Workers Builds ejecuta build seguido de deploy en producción y build seguido de `wrangler preview` en previews; además usa la versión Wrangler de `package.json`: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) (consultado 2026-10-05).
- Las ramas distintas de producción requieren habilitar Preview Builds: [Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/) (consultado 2026-10-05).
- La conexión GitHub inicial requiere autorización interactiva de la aplicación desde el dashboard y permisos adecuados sobre el repositorio: [Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/) y [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/) (consultados 2026-10-05).

## Acceptance Criteria

1. `package.json` contiene `wrangler: "4.147.0"` en `devDependencies`, y `package-lock.json` resuelve esa misma versión sin alterar innecesariamente las versiones directas existentes.
2. `wrangler.jsonc` es válido para el schema de la versión fijada y declara exactamente el nombre `valhalla-committee`, fecha `2026-10-05` y directorio de assets `./dist`; no declara `main`, secretos, IDs de cuenta, rutas ni bindings.
3. `npm ci`, `npm run check` y `npm run build` finalizan con código cero en Node.js compatible; el build crea `dist/index.html` y sus assets locales.
4. Tras el build, `npm run deploy -- --dry-run` finaliza con código cero y valida que Wrangler puede preparar un despliegue assets-only desde `./dist` sin autenticación ni publicación real.
5. `npm run dev` conserva el servidor Vite existente; `npm run dev:worker` y `npm run preview` sirven localmente el contenido compilado mediante `wrangler dev`; una petición a `/` devuelve la landing. Las comprobaciones pueden ser manuales o smoke checks de proceso/HTTP y no requieren una nueva librería de test.
6. `npm run deploy` invoca `wrangler deploy` y `npm run preview:deploy` invoca `wrangler preview`; no se ejecutan sin `--dry-run` fuera del entorno Cloudflare autorizado durante la validación de repositorio.
7. El diff de implementación queda limitado a configuración de despliegue, scripts y lockfile; no cambia `index.html`, `src/**`, `docs/product/**`, `.env*` ni añade secretos o artefactos `dist/` versionados.
8. En el dashboard de Cloudflare, el Worker muestra el repositorio GitHub `mquitoss/valhalla-committee`, raíz del repositorio, build `npm run build`, deploy `npm run deploy`, preview `npm run preview:deploy`, rama de producción `main` y Preview Builds habilitadas.
9. Una ejecución de Workers Builds sobre un commit de `main` completa build y despliegue de producción; la URL resultante sirve la landing estática.
10. Una ejecución sobre una rama distinta de `main` completa build y `wrangler preview`, no promociona producción y expone una Preview URL aislada. La evidencia puede ser el build de Cloudflare y su check/comentario en GitHub.
11. La instalación de la GitHub App tiene acceso a este repositorio (preferiblemente sólo a repositorios seleccionados), y ningún token/credencial aparece en Git, logs copiados a los artefactos de workflow o configuración pública.

## Invariants

- `main` es la única rama de producción; cualquier otra rama usa previews y no despliegue productivo.
- `dist/` es un artefacto generado por Vite, nunca fuente ni archivo versionado.
- El mismo `wrangler.jsonc` gobierna desarrollo Workers, dry-run, preview y producción.
- El proyecto sigue siendo assets-only: no existe entrypoint Worker ni ejecución server-side.
- El build continúa realizando type-check antes de Vite.
- Las credenciales permanecen fuera del repositorio y de las variables `VITE_*`.
- El contenido y comportamiento actual de la landing no cambian.

## Risks

- La autorización de GitHub y la selección de cuenta/Worker requieren una sesión interactiva y permisos que el agente puede no tener; sin ellos, la conexión externa y los criterios 8-11 no podrán completarse aunque la configuración local sea correcta.
- El nombre `valhalla-committee` podría existir ya en la cuenta Cloudflare seleccionada o apuntar a un Worker que no deba reemplazarse; el titular debe confirmar el destino antes del primer deploy.
- `wrangler preview` y Worker Previews son funcionalidad actual de Wrangler/Workers Builds; una cuenta con un Worker antiguo puede requerir la migración irreversible descrita por Cloudflare.
- Un despliegue desde `main` publica inmediatamente según la configuración de Workers Builds; una configuración errónea de rama o comandos podría afectar producción.
- Dependencias de build o límites de la cuenta Cloudflare pueden hacer fallar CI aunque los checks locales pasen.
- Variables `VITE_*` configuradas en Builds se incrustan públicamente en el bundle; no deben utilizarse para credenciales.

## Open Questions

- ¿Qué cuenta de Cloudflare debe poseer el Worker? Debe seleccionarla el titular durante la autorización; no bloquea la especificación local.
- ¿Existe ya un Worker llamado `valhalla-committee` en esa cuenta? Si existe, el titular debe confirmar que es el destino correcto antes de conectarlo o desplegarlo.
- ¿Debe habilitarse posteriormente un dominio personalizado? Queda expresamente fuera de este alcance; el primer resultado puede usar las URL administradas por Cloudflare.
- ¿Hay variables públicas `VITE_CONTACT_EMAIL` o `VITE_ANALYTICS_ENDPOINT` que deban definirse en Builds? No se requieren para esta integración y deben permanecer vacías salvo decisión separada del titular.

## Assumptions

- El remoto inspeccionado `origin` (`git@github.com:mquitoss/valhalla-committee.git`) es el repositorio que debe conectarse.
- `main` es y seguirá siendo la rama de producción elegida por el usuario.
- La cuenta Cloudflare permite Workers Builds, Static Assets y Worker Previews, y el operador tiene permisos para instalar/autorizar la GitHub App y administrar Builds.
- El Worker se publicará inicialmente sin dominio personalizado y sin recursos enlazados.
- La versión exacta `4.147.0`, publicada en npm el 2026-10-05, es la versión v4 que debe fijarse durante implementación.
- La configuración del dashboard es estado externo: se documenta y verifica con evidencia del dashboard/build, pero no puede representarse íntegramente mediante archivos del repositorio.

## Decisions & Alternatives Considered

- **Configuración de Worker**
  - Chosen: Worker de solo Static Assets con `wrangler.jsonc`, sin `main`, y `assets.directory: "./dist"`.
  - Alternatives considered: Cloudflare Pages, Workers Sites legado, entrypoint Worker y plugin Vite de Cloudflare.
  - Why: coincide con la salida estática existente, es la configuración recomendada actual y evita runtime o dependencias innecesarias.
- **Versión de Wrangler**
  - Chosen: fijar exactamente `4.147.0` como `devDependency` y en el lockfile.
  - Alternatives considered: rango `^4`, instalación global o `npx` sin dependencia local.
  - Why: Workers Builds usa la versión de `package.json`; el pin hace reproducibles desarrollo, CI, preview y despliegue.
- **Separación build/deploy**
  - Chosen: mantener `npm run build` separado y hacer que `deploy`/`preview:deploy` sólo invoquen Wrangler; los scripts locales Workers compilan antes de servir.
  - Alternatives considered: repetir `npm run build` dentro de cada comando de despliegue o usar custom builds de Wrangler.
  - Why: Workers Builds ya ejecuta dos pasos y actualmente no respeta custom builds de Wrangler; evita builds duplicados y deja explícita la salida `dist/`.
- **Servidor de desarrollo**
  - Chosen: preservar `npm run dev` para Vite y añadir `dev:worker`; convertir `preview` en una vista local del build mediante `wrangler dev`.
  - Alternatives considered: sustituir por completo Vite dev o mantener `vite preview` como único preview.
  - Why: conserva el feedback rápido actual y añade paridad comprobable con Workers Static Assets.
- **Previews de ramas**
  - Chosen: Worker Previews con `wrangler preview` para toda rama distinta de `main`.
  - Alternatives considered: desplegar entornos Wrangler permanentes, usar `wrangler versions upload` o desactivar previews.
  - Why: satisface el aislamiento por rama sin promocionar producción y es el flujo predeterminado actual de Workers Builds.
- **Conexión con GitHub**
  - Chosen: autorización interactiva mediante la GitHub App oficial desde Cloudflare, con acceso mínimo al repositorio.
  - Alternatives considered: GitHub Actions con token manual o llamadas API ad hoc.
  - Why: el usuario pidió Workers Builds; OAuth/instalación requiere intervención del titular y evita guardar credenciales en el repositorio.
- **Validación**
  - Chosen: reutilizar type-check/build, dry-run de Wrangler y smoke checks HTTP, más evidencia de builds alojados.
  - Alternatives considered: añadir Vitest, Playwright u otro framework.
  - Why: el cambio es declarativo y los frameworks no aportarían cobertura proporcional.
