# Valhalla · Landing page

Implementación de las especificaciones internas de producto y diseño. HTML semántico, TypeScript y Vite, sin framework de interfaz ni servicios externos necesarios para mostrar la página.

La dirección «Editorial Hacker / Lab Notes» se concreta en fondo carbón, tipografía Geist, retícula y separadores visibles, diagramas y verde reservado a interacción y estados. El contenido principal vive en `index.html`, las interacciones en `src/main.ts` y los estilos y puntos de ruptura compartidos en `src/style.css`. La página dedicada de Job Crawler vive en `proyectos/job-crawler/index.html`, con sus propios estilos, datos e interacciones en `src/job-crawler*`.

## Desarrollo

Requiere Node.js 22.12 o posterior y npm.

```sh
npm ci
npm run dev
```

La terminal muestra la dirección local. Para usar un puerto concreto:

```sh
npm run dev -- --port 4173 --strictPort
```

## Compilación

```sh
npm run check
npm run build
npm run preview
```

`dist/` contiene la web estática lista para servir. No se ha desplegado ni publicado. Geist Sans y Geist Mono se sirven localmente; no hay peticiones a Google Fonts.

## Contacto

Copiar `.env.example` a `.env.local` y establecer `VITE_CONTACT_EMAIL` cuando se haya creado el buzón genérico. Las variables `VITE_*` son públicas: no introducir credenciales. Reiniciar el servidor o recompilar después de cambiar la configuración.

Mientras el correo esté vacío, sea inválido o use un dominio terminado en `.example`, `.invalid` o `.test`, la CTA muestra un aviso de próxima disponibilidad. No se recogen mensajes ni se simulan envíos.

Con un correo configurado, el diálogo permite preparar un borrador con nombre opcional y una descripción de 10 a 3000 caracteres. «Abrir en mi correo» entrega el borrador a la aplicación habitual; el visitante decide cuándo enviarlo. Editar los campos invalida el borrador anterior. El correo directo también aparece al pie.

No hay backend de envío, almacenamiento de contactos ni confirmación de entrega. El envío final ocurre fuera de la web.

## Interacciones y accesibilidad

- Los cinco proyectos aparecen como expedientes consecutivos. Cada uno tiene un desplegable nativo con la pregunta que se investiga, accesible con teclado. Job Crawler enlaza a su página dedicada en `/proyectos/job-crawler/`.
- Los diagramas SVG tienen descripciones accesibles y una composición específica para móvil. Son esquemas conceptuales, no capturas de productos en funcionamiento.
- La página conserva su contenido esencial y los desplegables en el HTML. Sin JavaScript, el menú, los cinco proyectos y los doce pasos del mapa de Job Crawler siguen visibles.
- Navegación por anclas con sección activa, menú móvil con cierre mediante Escape, enlace para saltar al contenido, foco visible y diálogo nativo.
- Adaptación desde 320 px y reducción de animación con `prefers-reduced-motion`.
- Se distinguen fase y actividad: Turnos en curso; TraceFlow en fase de prototipo; OpenClaw/Aiden en investigación y en curso, según la guía 003. La interfaz principal está en español.
- La tesis sobre el criterio forma parte del método de cinco pasos. El comité incluye los roles de Marc, Raúl y Javi y tres círculos superpuestos que muestran cómo se complementan; su intersección central representa el criterio compartido.

## Job Crawler

Quinto expediente, en funcionamiento. La página dedicada desarrolla «Buscar oportunidades ya es un trabajo» y mantiene los dos disparadores independientes de la referencia: búsqueda a las 05:00 y publicación de los resultados disponibles al corte de las 09:00. PostgreSQL comparte contexto entre ambos ciclos. El análisis con Codex/OpenAI es opcional; las decisiones finales son humanas.

- El mapa conserva los doce pasos y distingue flujo principal, datos, contexto del siguiente día y revisión humana.
- Hover o foco para ver función, herramientas, entradas, salidas y un ejemplo ilustrativo. Clic para fijar el nodo y sus conexiones; Escape o el cierre liberan la selección. Los filtros fijan un ciclo completo.
- En pantallas estrechas, las notas aparecen junto al nodo seleccionado. En móvil, los ciclos se apilan sin reducir el texto a una miniatura.
- «Recorrer el día» reproduce una secuencia ilustrativa que se puede pausar. No consulta datos reales ni representa la duración real de los procesos.
- La animación se puede desactivar; el mapa pausa el recorrido al salir de pantalla o cambiar de pestaña. Con `prefers-reduced-motion`, la lectura avanza manualmente con «Siguiente paso».
- Vite genera ambas páginas como entradas HTML independientes. La ruta dedicada funciona con navegación directa en el resultado estático de `dist/`.

## Analítica

Se generan eventos sin nombres, correos, texto del formulario, cookies ni identificadores persistentes:

| Evento | Momento |
| --- | --- |
| `project_view` | Al menos un 20 % del expediente entra en pantalla con la página visible; una vez por proyecto y carga |
| `project_explore` | Apertura de «La pregunta que investigamos»; incluye el identificador del proyecto |
| `cta_click` | Clic en Explorar proyectos, Hablemos o Cuéntanos el problema |
| `contact_open` | Apertura del diálogo, incluido el aviso de disponibilidad |
| `contact_email_draft` | Preparación de un borrador válido |
| `contact_email_open` | Clic para abrir el borrador o el correo directo |

Están disponibles como eventos `valhalla:analytics`, en `window.valhallaEvents` (últimos 100, sólo en memoria) y en la consola de desarrollo. **No se recopilan de forma persistente por defecto.**

`VITE_ANALYTICS_ENDPOINT` permite conectar un colector del mismo origen, que debe implementarse o configurarse en el alojamiento. Recibe JSON mediante `sendBeacon`; no se permite un destino de terceros y no se transmite cuando está activo Do Not Track. La web no incluye ese colector. No introducir datos personales en sus registros ni usar estos eventos como confirmación de recepción del correo.

## Antes de publicar

1. Crear el buzón y configurar su dirección.
2. Confirmar textos públicos y estados de los cinco proyectos.
3. Configurar el colector si se necesitan métricas persistentes.
4. Decidir dominio y alojamiento; comprobar la versión publicada en escritorio y móvil.
