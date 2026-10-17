export type Loop = 'search' | 'publish' | 'shared';
export type CrawlerNode = {
  id: string;
  loop: Loop;
  title: string;
  tool: string;
  short: string;
  description: string;
  input: string;
  output: string;
  example: string;
  optional?: boolean;
  human?: boolean;
};

// Illustrative examples describe the system; they are not live job-search data.
export const crawlerNodes: CrawlerNode[] = [
  {
    "id": "01",
    "loop": "search",
    "title": "El día empieza solo.",
    "tool": "systemd (Linux) · launchd (macOS)",
    "short": "A las 05:00 se activa la búsqueda diaria.",
    "description": "Un temporizador de systemd en Linux pone en marcha la búsqueda diaria a las 05:00. En macOS, la alternativa es launchd. El horario inicia el trabajo; no determina cuánto tardará.",
    "input": "Hora programada: 05:00.",
    "output": "Inicio del ciclo diario de búsqueda.",
    "example": "05:00 → comenzar la búsqueda del día."
  },
  {
    "id": "02",
    "loop": "search",
    "title": "Buscar con contexto.",
    "tool": "Python · Django · PostgreSQL",
    "short": "Carga el contexto, planifica y conserva las tareas.",
    "description": "El coordinador en Python y Django recupera el perfil, las fuentes y el historial desde PostgreSQL. Planifica el trabajo del worker y conserva las tareas de forma persistente para dar continuidad a la búsqueda.",
    "input": "Perfil, preferencias, fuentes e historial en PostgreSQL.",
    "output": "Plan de trabajo y tareas persistentes en PostgreSQL.",
    "example": "Perfil actualizado → fuentes y búsquedas del día."
  },
  {
    "id": "03",
    "loop": "search",
    "title": "Salir a buscar.",
    "tool": "Brave Search API · Python · HTTPX",
    "short": "Localiza empresas, páginas de empleo y URLs candidatas.",
    "description": "Python consulta Brave Search API mediante HTTPX para localizar empresas, páginas de empleo y URLs candidatas. Cada resultado es una pista que aún debe contrastarse en su origen.",
    "input": "Búsquedas planificadas a partir del perfil.",
    "output": "Empresas, páginas de empleo y URLs candidatas.",
    "example": "Página de empleo de una empresa → URL para validar."
  },
  {
    "id": "04",
    "loop": "search",
    "title": "Volver a la fuente.",
    "tool": "Python · HTTPX · APIs Greenhouse/Lever · PostgreSQL",
    "short": "Valida, unifica y guarda. BambooHR, sujeto a validación.",
    "description": "Python y HTTPX consultan las fuentes originales y las APIs de Greenhouse y Lever. Los datos se normalizan, las ofertas se unifican y los cambios se guardan en PostgreSQL. La incorporación de BambooHR queda condicionada a validación.",
    "input": "URLs candidatas y ofertas ya conocidas.",
    "output": "Ofertas normalizadas, unificadas y guardadas en PostgreSQL.",
    "example": "Una oferta en dos fuentes → un registro con su origen."
  },
  {
    "id": "05",
    "loop": "search",
    "title": "Encontrar el encaje.",
    "tool": "JEV — Typesafe AI · Python",
    "short": "Evalúa de forma estructurada y aplica reglas de prioridad.",
    "description": "JEV — Typesafe AI evalúa cada oferta de forma estructurada frente al perfil. Python aplica las reglas de priorización y ordena las candidatas para la revisión y, cuando está habilitado, el análisis profundo.",
    "input": "Ofertas normalizadas y perfil de búsqueda.",
    "output": "Evaluaciones estructuradas y candidatas ordenadas por prioridad.",
    "example": "Oferta + perfil → evaluación estructurada y posición en el ranking."
  },
  {
    "id": "06",
    "loop": "search",
    "title": "Mirar más a fondo.",
    "tool": "Codex CLI · modelos OpenAI · Python · Pydantic",
    "short": "Análisis opcional de la evidencia, con salida validada.",
    "description": "Cuando el análisis profundo está habilitado, Python ejecuta Codex CLI con modelos OpenAI sobre las candidatas seleccionadas. Pydantic valida la salida estructurada antes de conservar la ficha de análisis.",
    "input": "Candidatas mejor situadas y evidencia disponible.",
    "output": "Ficha de análisis estructurada, validada con Pydantic y guardada en PostgreSQL.",
    "example": "Candidata seleccionada → análisis → ficha validada para revisarla.",
    "optional": true
  },
  {
    "id": "07",
    "loop": "publish",
    "title": "Otra hora. Otro ciclo.",
    "tool": "systemd / launchd",
    "short": "A las 09:00 se activa la publicación independiente.",
    "description": "Un segundo temporizador de systemd, o launchd en macOS, activa la publicación a las 09:00 de forma independiente. Consulta lo disponible al corte: no necesita que termine toda la búsqueda para preparar el resumen.",
    "input": "Hora programada: 09:00.",
    "output": "Inicio del ciclo de publicación.",
    "example": "09:00 → preparar el resumen con los resultados disponibles."
  },
  {
    "id": "08",
    "loop": "publish",
    "title": "Preparar lo relevante.",
    "tool": "Python · Django ORM · PostgreSQL",
    "short": "Fija un resumen inmutable y lo deja en la cola de salida.",
    "description": "Python consulta los resultados disponibles en PostgreSQL a través del ORM de Django. Prepara un resumen inmutable y guarda sus partes en una cola persistente de salida para su envío.",
    "input": "Catálogo, puntuaciones y análisis disponibles al corte.",
    "output": "Resumen inmutable y partes guardadas en la cola persistente de salida.",
    "example": "Catálogo al corte → resumen inmutable → cola de salida."
  },
  {
    "id": "09",
    "loop": "publish",
    "title": "Dar salida al resumen.",
    "tool": "Python · HTTPX · API HTTP/JSON privada",
    "short": "Solicita el envío al conector y consulta su estado.",
    "description": "El emisor en Python utiliza HTTPX para solicitar el envío al conector mediante una API HTTP/JSON privada. Envía las partes con POST /messages y autenticación por token, y consulta el estado del envío.",
    "input": "Partes del resumen guardadas en la cola persistente de salida.",
    "output": "Solicitud de envío y consulta de estado.",
    "example": "Parte del resumen → solicitud al conector."
  },
  {
    "id": "10",
    "loop": "publish",
    "title": "Llegar donde ya estás.",
    "tool": "TypeScript · Node.js · whatsapp-web.js · Chromium",
    "short": "Envía por la sesión vinculada y registra la entrega.",
    "description": "El conector está escrito en TypeScript y se ejecuta sobre Node.js. Utiliza whatsapp-web.js y Chromium con una sesión persistente de WhatsApp, y conserva evidencia de aceptación y entrega del resumen.",
    "input": "Solicitud del emisor y sesión vinculada de WhatsApp.",
    "output": "Resumen enviado y evidencia de aceptación / entrega.",
    "example": "Resumen del día → conversación de WhatsApp."
  },
  {
    "id": "11",
    "loop": "publish",
    "title": "La decisión es tuya.",
    "tool": "Dashboard Django · plantillas HTML/CSS",
    "short": "Marc revisa las ofertas y decide desde el dashboard.",
    "description": "Marc recibe el resumen en WhatsApp y revisa las ofertas en un dashboard Django con plantillas HTML/CSS. La interfaz le permite aceptar, descartar, guardar o ajustar el perfil. Aquí el criterio sigue siendo humano.",
    "input": "Resumen y ofertas disponibles para revisar.",
    "output": "Decisiones humanas y posibles ajustes del perfil.",
    "example": "Una oferta → guardar para revisar más adelante.",
    "human": true
  },
  {
    "id": "12",
    "loop": "publish",
    "title": "Mañana no parte de cero.",
    "tool": "Django ORM · PostgreSQL",
    "short": "Guarda decisiones y versiones del perfil para mañana.",
    "description": "El ORM de Django guarda las decisiones y las versiones del perfil en PostgreSQL. El siguiente ciclo recupera ese contexto y su historial, junto con las ofertas, evaluaciones y estado del trabajo.",
    "input": "Decisiones y cambios de perfil de la revisión humana.",
    "output": "Decisiones y versiones del perfil persistidas para el próximo ciclo.",
    "example": "Preferencia ajustada → nueva versión del perfil → siguiente búsqueda."
  },
  {
    "id": "memory",
    "loop": "shared",
    "title": "Un contexto compartido.",
    "tool": "PostgreSQL 17",
    "short": "Catálogo · historial · evaluaciones · estado del trabajo",
    "description": "PostgreSQL 17 conserva el catálogo, el historial, las evaluaciones y el estado del trabajo. Los dos ciclos comparten ese contexto: la búsqueda aporta ofertas y análisis; la publicación consulta los resultados disponibles y conserva su cola de salida. El dashboard registra decisiones y versiones del perfil.",
    "input": "Ofertas, evaluaciones, análisis, estado de tareas y envíos, decisiones y versiones del perfil.",
    "output": "Catálogo, historial, evaluaciones y estado del trabajo persistentes para ambos ciclos y el dashboard.",
    "example": "Lo encontrado hoy + lo que decides → punto de partida de mañana."
  }
];
