// Datos del proyecto "Central de Abastos de Alimentos" – Ingenia Santander, Grupo 3 (UDES 2026).
// Proyecto finalizado al 100 %.

export const PROJECT = {
  name: 'Central de Abastos de Alimentos',
  company: 'Ingenia Santander',
  group: 'Grupo 3 · UDES',
  location: 'Autopista Girón – Bucaramanga',
  status: 'Proyecto completado',
  progress: 100,
  totalBudget: 65_000_000_000,
  tagline: 'Infraestructura agrologística moderna y sostenible para el área metropolitana de Bucaramanga.',
};

export const KPIS = [
  { value: '$65.000 M', label: 'Inversión total (COP)', hero: true },
  { value: '100 %', label: 'Proyecto y maqueta terminados', bar: 100 },
  { value: '4 + 1', label: 'Pabellones + administrativo' },
  { value: '6,4 ha', label: 'Área del predio' },
  { value: '≈ 23.700 m²', label: 'Área construida (pabellones y administrativo)' },
  { value: '320 m', label: 'Frente a la autopista' },
  { value: '38', label: 'Muelles de carga' },
  { value: '5 / 5', label: 'Hitos entregados' },
];

export const BUDGET = [
  { rubro: 'Estudios, diseños y licencias', value: 2_600_000_000 },
  { rubro: 'Adecuación de terreno y obras civiles', value: 7_800_000_000 },
  { rubro: 'Macro-pabellones (4)', value: 22_100_000_000 },
  { rubro: 'Refrigeración y cuartos fríos', value: 11_700_000_000 },
  { rubro: 'Edificio administrativo y servicios', value: 4_550_000_000 },
  { rubro: 'Vías perimetrales y urbanismo', value: 8_450_000_000 },
  { rubro: 'Redes hidrosanitarias y eléctricas', value: 4_800_000_000 },
  { rubro: 'Imprevistos y contingencias', value: 3_000_000_000 },
];

export const TEAM = [
  { role: 'Gerencia de proyecto', names: ['Josue Herrera Quintero'] },
  { role: 'Contabilidad y finanzas', names: ['Oscar Johanny Garavito Contreras'] },
  { role: 'Diseño, planos y arquitectura', names: ['Jhojan David Jacome Montejo', 'David Alejandro Fuentes Hernandez'] },
  { role: 'Sostenibilidad y riesgos', names: ['María Jose Herrera Bonilla'] },
];

export const SCHEDULE = [
  { id: 'H-01', desc: 'Diseños y planos finales', date: '29 sep' },
  { id: 'H-02', desc: 'Presupuesto y plan de compras', date: '01 oct' },
  { id: 'H-03', desc: 'Informe escrito final', date: '03 oct' },
  { id: 'H-04', desc: 'Entrega del proyecto', date: '06 oct' },
  { id: 'H-05', desc: 'Sustentación final', date: '10 nov' },
];

export const RISKS = [
  { event: 'Sobrecosto en insumos', prob: 'Alta', impact: 'Alto' },
  { event: 'Licencias ambientales', prob: 'Media', impact: 'Alto' },
  { event: 'Terreno para cuartos fríos', prob: 'Baja', impact: 'Alto' },
  { event: 'Entregables del equipo', prob: 'Media', impact: 'Medio' },
];

export const ODS = [
  { n: 2, name: 'Hambre cero', color: '#DDA63A' },
  { n: 3, name: 'Salud y bienestar', color: '#4C9F38' },
  { n: 8, name: 'Trabajo decente', color: '#A21942' },
  { n: 9, name: 'Industria e infraestructura', color: '#FD6925' },
  { n: 11, name: 'Ciudades sostenibles', color: '#FD9D24' },
  { n: 12, name: 'Consumo responsable', color: '#BF8B2E' },
];

export const fmtCOP = (v) => '$' + Math.round(v).toLocaleString('es-CO');
export const fmtM = (v) => '$' + (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' M';
