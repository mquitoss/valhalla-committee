import './style.css';
import './elements.css';

type AnalyticsEventName = 'project_view' | 'project_explore' | 'cta_click' | 'contact_open' | 'contact_email_draft' | 'contact_email_open';
type AnalyticsEvent = { event: AnalyticsEventName; properties: Record<string, string>; timestamp: string };

declare global {
  interface Window {
    valhallaEvents: AnalyticsEvent[];
  }
}

// No cookies, persistent storage, identifiers or contact text in analytics.
window.valhallaEvents = [];
const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
function track(event: AnalyticsEventName, properties: Record<string, string> = {}) {
  const entry: AnalyticsEvent = { event, properties, timestamp: new Date().toISOString() };
  window.valhallaEvents.push(entry);
  if (window.valhallaEvents.length > 100) window.valhallaEvents.shift();
  window.dispatchEvent(new CustomEvent('valhalla:analytics', { detail: entry }));
  if (import.meta.env.DEV) console.debug('[Valhalla analytics]', JSON.stringify(entry));
  if (!endpoint || navigator.doNotTrack === '1') return;
  try {
    const url = new URL(endpoint, window.location.origin);
    // Only explicit same-origin collectors are allowed; no third-party tracking.
    if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return;
    navigator.sendBeacon(url.href, new Blob([JSON.stringify(entry)], { type: 'application/json' }));
  } catch {
    // Analytics must never prevent navigation or contacting the team.
  }
}

const navigation = document.querySelector<HTMLElement>('#main-nav')!;
const menuToggle = document.querySelector<HTMLButtonElement>('.nav-toggle')!;
const mobileLayout = window.matchMedia('(max-width: 800px)');
function setMenuOpen(open: boolean) {
  menuToggle.setAttribute('aria-expanded', String(open));
  navigation.toggleAttribute('data-open', open);
}
menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
navigation.addEventListener('click', (event) => {
  if ((event.target as Element).closest('a')) setMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuToggle.focus();
  }
});
mobileLayout.addEventListener('change', () => setMenuOpen(false));
menuToggle.hidden = false;
document.body.classList.add('js');

const sections = [...document.querySelectorAll<HTMLElement>('[data-nav-section]')];
const navLinks = [...navigation.querySelectorAll<HTMLAnchorElement>('a')];
let navigationFrame = 0;
function updateCurrentSection() {
  navigationFrame = 0;
  let current = sections[0].id;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= window.innerHeight * 0.3) current = section.id;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = 'contacto';
  for (const link of navLinks) {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
function scheduleNavigationUpdate() {
  if (!navigationFrame) navigationFrame = requestAnimationFrame(updateCurrentSection);
}
window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
window.addEventListener('resize', scheduleNavigationUpdate);
updateCurrentSection();

// Exposure is counted once per project and page load, only while the page is visible.
const visibleProjects = new Set<HTMLElement>();
const projectObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const project = entry.target as HTMLElement;
    if (entry.isIntersecting && entry.intersectionRatio >= 0.2) visibleProjects.add(project);
    else visibleProjects.delete(project);
  }
  recordProjectViews();
}, { threshold: 0.2 });
function recordProjectViews() {
  if (document.visibilityState !== 'visible') return;
  for (const project of visibleProjects) {
    track('project_view', { project: project.dataset.project ?? '' });
    projectObserver.unobserve(project);
    visibleProjects.delete(project);
  }
}
document.querySelectorAll<HTMLElement>('[data-project]').forEach((project) => projectObserver.observe(project));
document.addEventListener('visibilitychange', recordProjectViews);
document.querySelectorAll<HTMLDetailsElement>('[data-project-detail]').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (detail.open) track('project_explore', { project: detail.dataset.projectDetail ?? '' });
    scheduleNavigationUpdate();
  });
});

document.querySelectorAll<HTMLAnchorElement>('[data-cta]').forEach((link) => {
  link.addEventListener('click', () => track('cta_click', { cta: link.dataset.cta ?? '' }));
});

const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog')!;
const trigger = document.querySelector<HTMLAnchorElement>('#contact-trigger')!;
const direct = document.querySelector<HTMLAnchorElement>('#contact-direct')!;
const preparedEmail = document.querySelector<HTMLAnchorElement>('#prepared-email-link')!;
const form = document.querySelector<HTMLFormElement>('#contact-form')!;
const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim() ?? '';
const isContactConfigured = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contactEmail)
  && !/[?&#%]/.test(contactEmail)
  && !/\.(example|invalid|test)$/i.test(contactEmail);

trigger.setAttribute('aria-haspopup', 'dialog');
trigger.addEventListener('click', (event) => {
  event.preventDefault();
  resetContactDraft();
  dialog.showModal();
  track('contact_open');
});

if (isContactConfigured) {
  direct.textContent = contactEmail;
  direct.href = `mailto:${contactEmail}`;
  direct.hidden = false;
  document.querySelector('#contact-availability')!.textContent = 'También puedes escribirnos directamente:';
  trigger.href = direct.href;
} else {
  document.querySelector('#dialog-title')!.textContent = 'Hablemos pronto.';
  document.querySelector('#dialog-intro')!.textContent = 'Estamos preparando nuestro correo de contacto. Vuelve pronto para contarnos ese problema o esa idea que tienes en mente.';
  document.querySelector<HTMLFormElement>('#contact-form')!.hidden = true;
}

function closeDialog() { dialog.close(); }
dialog.querySelector('.dialog-close')!.addEventListener('click', closeDialog);
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDialog();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isContactConfigured) return;
  const name = document.querySelector<HTMLInputElement>('#contact-name')!.value.trim();
  const field = document.querySelector<HTMLTextAreaElement>('#contact-message')!;
  const message = field.value.trim();
  if (message.length < 10) {
    field.setCustomValidity('Cuéntanos un poco más: escribe al menos 10 caracteres.');
    field.reportValidity();
    return;
  }
  field.setCustomValidity('');
  const body = `${name ? `Hola, soy ${name}.\n\n` : 'Hola, Valhalla.\n\n'}${message}`;
  const href = `mailto:${contactEmail}?subject=${encodeURIComponent('Una pregunta para Valhalla')}&body=${encodeURIComponent(body)}`;
  track('contact_email_draft');
  preparedEmail.href = href;
  preparedEmail.hidden = false;
  submitButton.hidden = true;
  document.querySelector('#contact-feedback')!.textContent = 'Tu borrador está listo. Ábrelo en tu aplicación de correo para revisarlo y enviarlo.';
  preparedEmail.focus();
});
function resetContactDraft() {
  preparedEmail.hidden = true;
  preparedEmail.removeAttribute('href');
  submitButton.hidden = false;
  document.querySelector('#contact-feedback')!.textContent = '';
}
form.addEventListener('input', resetContactDraft);
preparedEmail.addEventListener('click', () => track('contact_email_open'));
direct.addEventListener('click', () => track('contact_email_open', { source: 'direct' }));
document.querySelector('#contact-message')!.addEventListener('input', (event) => {
  (event.target as HTMLTextAreaElement).setCustomValidity('');
});
document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
