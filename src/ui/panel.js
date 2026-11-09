import { PROJECT, KPIS, BUDGET, TEAM, SCHEDULE, RISKS, ODS, fmtM } from '../data/project.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const check = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';

const TABS = {
  resumen: {
    title: 'Resumen',
    html: () => `
      <div class="status">${check}${esc(PROJECT.status)} · ${PROJECT.progress}%</div>
      <h2>${esc(PROJECT.name)}</h2>
      <p class="lead">${esc(PROJECT.tagline)}</p>
      <div class="kpis">
        ${KPIS.map((k) => `<div class="kpi${k.hero ? ' wide hero' : ''}${k.bar ? ' wide' : ''}"><b>${esc(k.value)}</b><span>${esc(k.label)}</span>${k.bar ? `<div class="bar"><i style="width:${k.bar}%"></i></div>` : ''}</div>`).join('')}
      </div>
      <div class="meta-line">${esc(PROJECT.location)}</div>`,
  },
  presupuesto: {
    title: 'Presupuesto',
    html: () => {
      const max = Math.max(...BUDGET.map((b) => b.value));
      return `
      <div class="kpis"><div class="kpi wide hero"><b>$65.000 M</b><span>Inversión total estimada (COP)</span></div></div>
      ${BUDGET.map((b) => `
        <div class="budget-row">
          <div class="top"><span>${esc(b.rubro)}</span><span>${fmtM(b.value)}</span></div>
          <div class="bar"><i style="width:${((b.value / max) * 100).toFixed(1)}%"></i></div>
        </div>`).join('')}`;
    },
  },
  equipo: {
    title: 'Equipo',
    html: () => TEAM.map((t) => `<div class="team-card"><div class="role">${esc(t.role)}</div><div class="name">${t.names.map(esc).join('<br>')}</div></div>`).join(''),
  },
  hitos: {
    title: 'Hitos',
    html: () => `
      <div class="kpis"><div class="kpi wide"><b>5 / 5</b><span>Hitos entregados</span><div class="bar"><i style="width:100%"></i></div></div></div>
      <ul class="timeline done">${SCHEDULE.map((s) => `<li><b>${s.id}</b> ${esc(s.desc)}<span class="date">${s.date}</span></li>`).join('')}</ul>`,
  },
  riesgos: {
    title: 'Riesgos',
    html: () => `<ul class="list">${RISKS.map((r) => `<li><b>${esc(r.event)}</b><div class="tags"><span class="tag ${r.prob}">P. ${r.prob}</span><span class="tag ${r.impact}">I. ${r.impact}</span><span class="tag ok">Mitigado</span></div></li>`).join('')}</ul>`,
  },
  ods: {
    title: 'ODS',
    html: () => `<div class="ods-grid">${ODS.map((o) => `<div class="ods-chip"><span class="n" style="background:${o.color}">${o.n}</span>${esc(o.name)}</div>`).join('')}</div>`,
  },
};

export function initInfoPanel() {
  const panel = document.getElementById('info');
  const nav = panel.querySelector('.tabs');
  const body = panel.querySelector('.tab-body');
  const toggle = document.getElementById('toggleInfo');
  const select = (key) => {
    nav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === key));
    body.innerHTML = TABS[key].html();
    body.scrollTop = 0;
  };
  nav.innerHTML = Object.entries(TABS).map(([k, t]) => `<button role="tab" data-tab="${k}">${t.title}</button>`).join('');
  nav.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) select(b.dataset.tab); });
  select('resumen');
  const setOpen = (open) => {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
  };
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  setOpen(false); // cerrado al iniciar
  return { setOpen };
}

export function renderCard(b, { onBack, onRoof } = {}) {
  const card = document.getElementById('card');
  if (!b) { card.classList.remove('open'); return; }
  const d = b.data;
  const area = d.w * d.d * (d.floors || 1);
  const ref = BUDGET[d.budgetRef];
  const s = b.stats || {};
  const extra = [];
  if (s.puestos) extra.push(['Puestos comerciales', s.puestos]);
  if (s.camaras) extra.push(['Cámaras de refrigeración', s.camaras]);
  if (s.locales) extra.push(['Locales con vitrina', s.locales]);
  if (s.bodegas) extra.push(['Bodegas comerciales', s.bodegas]);
  if (s.racks) extra.push(['Líneas de rack', s.racks]);
  if (s.carriles) extra.push(['Carriles de despacho', s.carriles]);
  if (s.recintos) extra.push(['Recintos', s.recintos]);
  if (s.transformadores) extra.push(['Transformadores', s.transformadores]);
  if (s.contenedores) extra.push(['Contenedores', s.contenedores]);
  if (s.bahias) extra.push(['Bahías de compost', s.bahias]);
  if (s.tanques) extra.push(['Tanques', s.tanques]);
  const docks = b.docks.length;
  card.innerHTML = `
    <button class="close" aria-label="Cerrar">✕</button>
    <div class="eyebrow"><i style="background:${d.accent}"></i>${esc(d.short)} · Construido</div>
    <h2>${esc(d.name)}</h2>
    <div class="sub">${esc(d.subtitle)}</div>
    <p>${esc(d.description)}</p>
    <div class="kpis">
      <div class="kpi"><b>${d.w} × ${d.d} m</b><span>Planta</span></div>
      <div class="kpi"><b>${area.toLocaleString('es-CO')} m²</b><span>Área${d.floors ? ` (${d.floors} pisos)` : ''}</span></div>
      <div class="kpi"><b>${d.type === 'gable' ? `${d.eave} / ${d.ridge} m` : `${d.eave} m`}</b><span>${d.type === 'gable' ? 'Alero / cumbrera' : d.type === 'service' ? 'Altura de muros' : 'Altura'}</span></div>
      <div class="kpi"><b>${docks || '—'}</b><span>Muelles</span></div>
      ${extra.map(([k, v]) => `<div class="kpi"><b>${v}</b><span>${k}</span></div>`).join('')}
    </div>
    <h3>Zonas interiores</h3>
    <ul>${d.zones.map((z) => `<li>${esc(z)}</li>`).join('')}</ul>
    <h3>Rubro presupuestal</h3>
    <div class="budget-row"><div class="top"><span>${esc(ref.rubro)}</span><span>${fmtM(ref.value)}</span></div></div>
    ${d.type !== 'service' || d.roofed ? '<button class="roofbtn">Poner / quitar cubierta</button>' : ''}
    <button class="back"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>Volver al conjunto</button>`;
  card.querySelector('.back').onclick = onBack;
  card.querySelector('.close').onclick = onBack;
  const rb = card.querySelector('.roofbtn');
  if (rb) rb.onclick = onRoof;
  card.scrollTop = 0;
  card.classList.add('open');
}
