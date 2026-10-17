import './style.css';
import './job-crawler.css';
import { crawlerNodes, type CrawlerNode, type Loop } from './job-crawler-data';

type EdgeKind = 'main' | 'data' | 'context' | 'human';
type Edge = { from: string; to: string; kind: EdgeKind };
type LoopFilter = Loop | 'all';

const map = document.querySelector<HTMLElement>('#crawler-map')!;
const flow = document.querySelector<HTMLElement>('.jc-flow')!;
const nodeButtons = [...map.querySelectorAll<HTMLButtonElement>('[data-node]')];
const nodeById = new Map(crawlerNodes.map((node) => [node.id, node]));
const buttonById = new Map(nodeButtons.map((button) => [button.dataset.node!, button]));
const inspector = document.querySelector<HTMLElement>('#node-detail')!;
const inspectorSlot = document.querySelector<HTMLElement>('.jc-inspector-slot')!;
const closeButton = inspector.querySelector<HTMLButtonElement>('.jc-detail-close')!;
const fields = document.querySelector<HTMLElement>('#detail-fields')!;
const announcement = document.querySelector<HTMLElement>('#map-announcement')!;
const filterButtons = [...map.querySelectorAll<HTMLButtonElement>('[data-loop]')];
const motionButton = map.querySelector<HTMLButtonElement>('.jc-motion')!;
const playButton = map.querySelector<HTMLButtonElement>('.jc-play')!;
const playStatus = document.querySelector<HTMLElement>('#day-status')!;
const progress = document.querySelector<HTMLElement>('#day-progress')!;
const svg = map.querySelector<SVGSVGElement>('.jc-connections')!;
const pathGroup = map.querySelector<SVGGElement>('#flow-paths')!;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const inlineNotes = window.matchMedia('(max-width: 1199px)');
const stackedFlow = window.matchMedia('(max-width: 600px)');
const sequence = ['01', '02', '03', '04', '05', '06', 'memory', '07', '08', '09', '10', '11', '12', 'memory'];

const edges: Edge[] = [
  ...['01', '02', '03', '04', '05', '07', '08', '09', '10', '11'].map((from): Edge => ({
    from, to: String(Number(from) + 1).padStart(2, '0'),
    kind: ['10', '11'].includes(from) ? 'human' : 'main',
  })),
  { from: '04', to: 'memory', kind: 'data' },
  { from: '05', to: 'memory', kind: 'data' },
  { from: '06', to: 'memory', kind: 'data' },
  { from: 'memory', to: '08', kind: 'data' },
  { from: '12', to: 'memory', kind: 'context' },
  { from: 'memory', to: '02', kind: 'context' },
];
const pathElements: { edge: Edge; line: SVGPathElement; pulse: SVGPathElement }[] = [];
let pinned: string | null = null;
let preview: string | null = null;
let filter: LoopFilter = 'all';
let stepIndex = -1;
let playing = false;
let timer: number | undefined;
let motionRequested = !reducedMotion.matches;
let inView = false;
let drawingFrame = 0;
let restoringFocus = false;

function setText(id: string, value: string) {
  document.getElementById(id)!.textContent = value;
}

function currentNode(): CrawlerNode | undefined {
  return nodeById.get(pinned ?? preview ?? sequence[stepIndex]);
}

function renderDetail(node?: CrawlerNode) {
  const target = inlineNotes.matches && node
    ? buttonById.get(node.id)!.parentElement!
    : inspectorSlot;
  if (inspector.parentElement !== target) {
    if (inlineNotes.matches && node) buttonById.get(node.id)!.after(inspector);
    else target.append(inspector);
  }
  inspector.hidden = inlineNotes.matches && !node;
  closeButton.hidden = !pinned;
  fields.hidden = !node;
  if (!node) {
    setText('detail-kicker', 'NOTAS DEL SISTEMA');
    setText('detail-title', 'Cada paso tiene su porqué.');
    setText('detail-description', 'Pasa sobre un nodo o llega a él con el teclado para explorar su función. Haz clic para fijar la lectura y ver sus conexiones.');
    setText('detail-foot', 'EXPLORA / CONECTA / COMPRENDE');
    return;
  }
  setText('detail-kicker', node.id === 'memory' ? 'MEMORIA / AMBOS CICLOS' : 'PASO ' + node.id + ' / ' + (node.loop === 'search' ? 'EXPLORACIÓN' : 'PUBLICACIÓN'));
  setText('detail-title', node.title);
  setText('detail-description', node.description);
  setText('detail-tool', node.tool);
  setText('detail-input', node.input);
  setText('detail-output', node.output);
  setText('detail-example', node.example);
  setText('detail-foot', pinned ? 'LECTURA FIJADA / ESC PARA LIBERAR' : playing ? 'RECORRIDO ILUSTRATIVO' : 'CLIC PARA FIJAR LA LECTURA');
}

function render() {
  const active = currentNode();
  const adjacent = new Set<string>();
  if (active) {
    adjacent.add(active.id);
    for (const edge of edges) {
      if (edge.from === active.id || edge.to === active.id) {
        adjacent.add(edge.from);
        adjacent.add(edge.to);
      }
    }
  }
  for (const button of nodeButtons) {
    const id = button.dataset.node!;
    const node = nodeById.get(id)!;
    const inFilter = filter === 'all' || node.loop === filter || node.loop === 'shared';
    const related = active ? adjacent.has(id) : filter !== 'all' && inFilter;
    button.classList.toggle('is-active', id === active?.id);
    button.classList.toggle('is-related', related);
    button.classList.toggle('is-dimmed', active ? !related : !inFilter);
    button.classList.toggle('is-playing', playing && id === active?.id);
    button.setAttribute('aria-pressed', String(id === pinned));
  }
  for (const { edge, line, pulse } of pathElements) {
    const related = active
      ? edge.from === active.id || edge.to === active.id
      : filter !== 'all' && [edge.from, edge.to].every((id) => {
        const loop = nodeById.get(id)!.loop;
        return loop === filter || loop === 'shared';
      });
    const dimmed = Boolean(active || filter !== 'all') && !related;
    line.classList.toggle('is-active', related);
    line.classList.toggle('is-dimmed', dimmed);
    pulse.classList.toggle('is-active', related);
  }
  filterButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.loop === filter)));
  // Inline notes stay closed during playback so each step does not shift the map.
  renderDetail(playing && inlineNotes.matches ? undefined : active);
  scheduleDraw();
}

function announce(message: string) {
  announcement.textContent = message;
}

function clearSelection(restoreFocus = false) {
  const previous = pinned;
  pinned = null;
  preview = null;
  filter = 'all';
  stepIndex = -1;
  stopPlayback();
  render();
  if (restoreFocus && previous) {
    restoringFocus = true;
    buttonById.get(previous)?.focus({ preventScroll: true });
    restoringFocus = false;
  }
  announce('Selección liberada.');
}

for (const button of nodeButtons) {
  const id = button.dataset.node!;
  button.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || inlineNotes.matches || pinned || playing) return;
    preview = id;
    render();
  });
  button.addEventListener('pointerleave', () => {
    if (!preview || pinned || playing || document.activeElement === button) return;
    preview = null;
    render();
  });
  button.addEventListener('focus', () => {
    if (pinned || playing || restoringFocus) return;
    preview = id;
    render();
  });
  button.addEventListener('blur', (event) => {
    if (pinned || playing || inspector.contains(event.relatedTarget as Node | null)) return;
    preview = null;
    render();
  });
  button.addEventListener('click', () => {
    const wasPinned = pinned === id;
    stepIndex = -1;
    stopPlayback();
    pinned = wasPinned ? null : id;
    preview = wasPinned ? null : id;
    render();
    announce(wasPinned ? 'Selección liberada.' : 'Paso fijado: ' + nodeById.get(id)!.title + ' Entradas y salidas disponibles en las notas.');
  });
}
closeButton.addEventListener('click', () => clearSelection(true));
map.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    clearSelection(inspector.contains(document.activeElement));
  }
});
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    stepIndex = -1;
    stopPlayback();
    pinned = null;
    preview = null;
    filter = button.dataset.loop as LoopFilter;
    progress.style.width = '0%';
    render();
    announce(filter === 'all' ? 'Mapa completo.' : filter === 'search' ? 'Recorrido fijado: búsqueda y evaluación, pasos 01 a 06 y contexto compartido.' : 'Recorrido fijado: publicación y revisión, pasos 07 a 12 y contexto compartido.');
  });
});

function updateMotion() {
  const enabled = motionRequested && !reducedMotion.matches;
  map.dataset.motion = enabled && inView && !document.hidden ? 'on' : 'off';
  motionButton.setAttribute('aria-pressed', String(enabled));
  motionButton.querySelector('[data-motion-label]')!.textContent = reducedMotion.matches ? 'reducida' : enabled ? 'activa' : 'pausada';
  motionButton.disabled = reducedMotion.matches;
  motionButton.title = reducedMotion.matches ? 'Se respeta tu preferencia de reducir el movimiento.' : 'Activar o pausar el movimiento del mapa.';
}

function updatePlaybackControls() {
  if (reducedMotion.matches) {
    playButton.innerHTML = '<span aria-hidden="true">→</span> ' + (stepIndex === sequence.length - 1 ? 'Volver a empezar' : 'Siguiente paso');
  } else {
    const label = playing ? 'Pausar recorrido' : stepIndex === sequence.length - 1 ? 'Repetir recorrido' : stepIndex >= 0 ? 'Continuar recorrido' : 'Recorrer el día';
    playButton.innerHTML = '<span aria-hidden="true">' + (playing ? 'Ⅱ' : '▷') + '</span> ' + label;
  }
  if (stepIndex < 0) {
    playStatus.textContent = reducedMotion.matches ? 'Lectura sin animación' : 'Lectura del ciclo';
    progress.style.width = '0%';
  }
}

function stopPlayback() {
  window.clearTimeout(timer);
  timer = undefined;
  playing = false;
  updatePlaybackControls();
}

function advanceStep() {
  stepIndex += 1;
  preview = null;
  const node = nodeById.get(sequence[stepIndex])!;
  progress.style.width = String(((stepIndex + 1) / sequence.length) * 100) + '%';
  playStatus.textContent = stepIndex === sequence.length - 1
    ? 'Contexto para mañana'
    : node.id === 'memory' ? 'Contexto compartido'
    : node.human ? 'Tu revisión / tú decides'
    : (node.loop === 'search' ? '05:00' : '09:00') + ' / Paso ' + node.id;
  if (stepIndex === sequence.length - 1) stopPlayback();
  updatePlaybackControls();
  render();
  if (playing) timer = window.setTimeout(advanceStep, 2200);
}

playButton.addEventListener('click', () => {
  if (playing) {
    stopPlayback();
    render();
    return;
  }
  pinned = null;
  preview = null;
  filter = 'all';
  if (stepIndex === sequence.length - 1) stepIndex = -1;
  if (reducedMotion.matches) {
    advanceStep();
  } else {
    motionRequested = true;
    updateMotion();
    playing = true;
    advanceStep();
  }
});

motionButton.addEventListener('click', () => {
  motionRequested = !motionRequested;
  if (!motionRequested) stopPlayback();
  updateMotion();
  render();
});
reducedMotion.addEventListener('change', () => {
  stopPlayback();
  motionRequested = !reducedMotion.matches;
  updateMotion();
  render();
});

function createPaths() {
  for (const edge of edges) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('class', 'jc-edge jc-edge--' + edge.kind);
    line.setAttribute('marker-end', 'url(#flow-arrow)');
    line.dataset.from = edge.from;
    line.dataset.to = edge.to;
    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pulse.setAttribute('class', 'jc-edge-pulse');
    pulse.setAttribute('pathLength', '100');
    pathGroup.append(line, pulse);
    pathElements.push({ edge, line, pulse });
  }
}

function drawConnections() {
  drawingFrame = 0;
  const canvas = flow.getBoundingClientRect();
  svg.setAttribute('viewBox', '0 0 ' + canvas.width + ' ' + canvas.height);
  const box = (id: string) => {
    const rect = buttonById.get(id)!.getBoundingClientRect();
    return { x: rect.left - canvas.left, y: rect.top - canvas.top, w: rect.width, h: rect.height };
  };
  for (const { edge, line, pulse } of pathElements) {
    const from = box(edge.from);
    const to = box(edge.to);
    let d: string;
    if (edge.kind === 'main' || edge.kind === 'human') {
      const fromBadge = buttonById.get(edge.from)!.querySelector('.jc-node-number')!.getBoundingClientRect();
      const toBadge = buttonById.get(edge.to)!.querySelector('.jc-node-number')!.getBoundingClientRect();
      const x = fromBadge.left - canvas.left + fromBadge.width / 2;
      const start = fromBadge.bottom - canvas.top + 3;
      const end = toBadge.top - canvas.top - 5;
      d = 'M ' + x + ' ' + start + ' V ' + end;
    } else if (stackedFlow.matches) {
      // Shared data travels on a separate margin, never across the node copy.
      const track = edge.kind === 'context' ? 3 : 7;
      const fromY = from.y + from.h / 2;
      const toY = to.y + to.h / 2;
      const fromX = edge.from === 'memory' ? from.x - 4 : from.x + 4;
      const toX = edge.to === 'memory' ? to.x - 4 : to.x + 4;
      d = 'M ' + fromX + ' ' + fromY + ' H ' + track + ' V ' + toY + ' H ' + toX;
    } else {
      const forward = from.x < to.x;
      const x1 = forward ? from.x + from.w + 3 : from.x - 3;
      const x2 = forward ? to.x - 5 : to.x + to.w + 5;
      const y1 = from.y + from.h / 2;
      const y2 = to.y + to.h / 2;
      const bend = (x1 + x2) / 2;
      d = 'M ' + x1 + ' ' + y1 + ' H ' + bend + ' V ' + y2 + ' H ' + x2;
    }
    line.setAttribute('d', d);
    pulse.setAttribute('d', d);
  }
}

function scheduleDraw() {
  if (!drawingFrame) drawingFrame = requestAnimationFrame(drawConnections);
}

new ResizeObserver(scheduleDraw).observe(flow);
inlineNotes.addEventListener('change', render);
stackedFlow.addEventListener('change', scheduleDraw);
window.addEventListener('resize', scheduleDraw);
document.fonts.ready.then(scheduleDraw);

new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  if (!inView && playing) {
    stopPlayback();
    render();
  }
  updateMotion();
}, { threshold: 0 }).observe(map);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) {
    stopPlayback();
    render();
  }
  updateMotion();
});

map.querySelector<HTMLElement>('.jc-toolbar')!.hidden = false;
map.querySelector<HTMLElement>('.jc-timeline')!.hidden = false;
createPaths();
updateMotion();
updatePlaybackControls();
render();
document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
