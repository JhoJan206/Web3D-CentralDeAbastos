import { PROJECT, BUDGET, EXECUTION, TEAM, METHOD, SCHEDULE, LOG, RISKS, ODS, fmtCOP, fmtM } from '../data/project.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TABS = {
  resumen: {
    title: 'Resumen',
    html: () => `
      <h2>${esc(PROJECT.name)}</h2>
      <p>${esc(PROJECT.summary)}</p>
      <div class="kpis">
        <div class="kpi wide hero"><b>${fmtCOP(PROJECT.totalBudget)}</b><span>Presupuesto general estimado (COP)</span></div>
        <div class="kpi"><b>4</b><span>Macro-pabellones comerciales</span></div>
        <div class="kpi"><b>1</b><span>Edificio administrativo central</span></div>
        <div class="kpi"><b>320 m</b><span>Frente sobre la autopista</span></div>
        <div class="kpi"><b>≈ 6,4 ha</b><span>Área aproximada del predio</span></div>
        <div class="kpi wide"><b>${PROJECT.modelProgress}%</b><span>Avance de la maqueta física (2.º corte)</span><div class="bar"><i style="width:${PROJECT.modelProgress}%"></i></div></div>
      </div>
      <h3>Ubicación</h3>
      <p>${esc(PROJECT.location)} · Área metropolitana de Bucaramanga. Referente operativo: Centroabastos Bucaramanga (bodegas 9, 10, 11 y Edificio Bicentenario).</p>
      <h3>Gestión</h3>
      <ul class="list">${METHOD.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`,
  },
  presupuesto: {
    title: 'Presupuesto',
    html: () => {
      const max = Math.max(...BUDGET.map((b) => b.value));
      return `
      <h2>Presupuesto desglosado</h2>
      <p>Inversión total estimada del proyecto a escala real.</p>
      <div class="kpis"><div class="kpi wide hero"><b>${fmtCOP(PROJECT.totalBudget)}</b><span>Total COP</span></div></div>
      ${BUDGET.map((b) => `
        <div class="budget-row">
          <div class="top"><span>${esc(b.rubro)}</span><span>${fmtM(b.value)}</span></div>
          <div class="bar"><i style="width:${((b.value / max) * 100).toFixed(1)}%"></i></div>
          <small>${esc(b.desc)} · ${((b.value / PROJECT.totalBudget) * 100).toFixed(1)}% del total</small>
        </div>`).join('')}
      <h3>Ejecución – fase de estudios</h3>
      <div class="kpis">
        <div class="kpi"><b>${fmtM(EXECUTION.spent)}</b><span>Ejecutado</span></div>
        <div class="kpi"><b>${fmtM(EXECUTION.assigned)}</b><span>Asignado</span></div>
        <div class="kpi wide"><b>${EXECUTION.pct}%</b><span>${esc(EXECUTION.rubro)}</span><div class="bar"><i style="width:${EXECUTION.pct}%;background:var(--accent-2)"></i></div></div>
      </div>
      <p>${esc(EXECUTION.note)}</p>`;
    },
  },
  equipo: {
    title: 'Equipo',
    html: () => `
      <h2>Organización</h2>
      <p>Modelo funcional adaptado a la gestión integral de infraestructuras agrologísticas de gran escala.</p>
      ${TEAM.map((t) => `<div class="team-card"><div class="role">${esc(t.role)}</div><div class="name">${t.names.map(esc).join('<br>')}</div><p>${esc(t.desc)}</p></div>`).join('')}`,
  },
  cronograma: {
    title: 'Cronograma',
    html: () => `
      <h2>Cronograma actualizado</h2>
      <ul class="timeline">${SCHEDULE.map((s) => `<li><b>${s.id}</b> · ${esc(s.desc)}<div class="meta">${s.date}</div></li>`).join('')}</ul>
      <h3>Bitácora del proyecto</h3>
      <ul class="list">${LOG.map((l) => `<li>${esc(l.act)}<div class="meta">${l.date} · ${esc(l.who)}</div></li>`).join('')}</ul>`,
  },
  riesgos: {
    title: 'Riesgos',
    html: () => `
      <h2>Matriz de riesgos</h2>
      <ul class="list">${RISKS.map((r) => `<li><b>${esc(r.event)}</b><div style="margin:6px 0"><span class="tag ${r.prob}">Prob. ${r.prob}</span><span class="tag ${r.impact}">Impacto ${r.impact}</span></div><div class="meta">${esc(r.plan)}</div></li>`).join('')}</ul>`,
  },
  ods: {
    title: 'ODS',
    html: () => `
      <h2>Objetivos de Desarrollo Sostenible</h2>
      <p>Mejora la forma en que se abastece, conserva y distribuye la comida en el área metropolitana.</p>
      ${ODS.map((o) => `<div class="ods"><div class="n" style="background:${o.color}">${o.n}</div><div><b>${esc(o.name)}</b><p>${esc(o.desc)}</p></div></div>`).join('')}`,
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
  if (window.innerWidth < 820) setOpen(false);
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
  const docks = d.docks.front + d.docks.back;
  card.innerHTML = `
    <button class="close" aria-label="Cerrar">✕</button>
    <div class="eyebrow"><i style="background:${d.accent}"></i>${esc(d.short)} · Clic en otro edificio para cambiar</div>
    <h2>${esc(d.name)}</h2>
    <div class="sub">${esc(d.subtitle)}</div>
    <p>${esc(d.description)}</p>
    <div class="kpis">
      <div class="kpi"><b>${d.w} × ${d.d} m</b><span>Dimensiones en planta</span></div>
      <div class="kpi"><b>${area.toLocaleString('es-CO')} m²</b><span>Área construida${d.floors ? ` (${d.floors} pisos)` : ''}</span></div>
      <div class="kpi"><b>${d.type === 'gable' ? `${d.eave} / ${d.ridge} m` : `${d.eave} m`}</b><span>${d.type === 'gable' ? 'Altura alero / cumbrera' : 'Altura total'}</span></div>
      <div class="kpi"><b>${docks || '—'}</b><span>Muelles de carga</span></div>
      ${extra.map(([k, v]) => `<div class="kpi"><b>${v}</b><span>${k}</span></div>`).join('')}
    </div>
    <h3>Zonas interiores</h3>
    <ul>${d.zones.map((z) => `<li>${esc(z)}</li>`).join('')}</ul>
    <h3>Rubro presupuestal relacionado</h3>
    <div class="budget-row"><div class="top"><span>${esc(ref.rubro)}</span><span>${fmtM(ref.value)}</span></div><small>${esc(ref.desc)}</small></div>
    <button class="roofbtn">Poner / quitar cubierta</button>
    <button class="back"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>Volver al conjunto</button>`;
  card.querySelector('.back').onclick = onBack;
  card.querySelector('.close').onclick = onBack;
  card.querySelector('.roofbtn').onclick = onRoof;
  card.scrollTop = 0;
  card.classList.add('open');
}
