// Datos tomados del documento "CentralDeAbastos – Grupo 3 – Entregable 2" (Ingenia Santander, UDES 2026)

export const PROJECT = {
  name: 'Central de Abastos de Alimentos',
  company: 'Ingenia Santander',
  group: 'Grupo 3 · Universidad del Santander – UDES',
  city: 'Bucaramanga, 2026',
  location: 'Autopista Girón – Bucaramanga',
  totalBudget: 65_000_000_000,
  modelProgress: 50,
  summary:
    'Infraestructura agrologística moderna y sostenible para el abastecimiento, conservación y distribución de alimentos en el área metropolitana de Bucaramanga. Toma como referente operativo a Centroabastos Bucaramanga e integra 4 macro-pabellones comerciales, cuartos fríos industriales, vías perimetrales de alto tráfico y un edificio administrativo central.',
  site: { front: 320, back: 283.5, left: 180, right: 220 },
};

export const BUDGET = [
  { rubro: 'Estudios, Diseños y Licencias', desc: 'Ensayos de suelo, estudios topográficos, diseños arquitectónicos y estructurales, licencias ambientales y urbanísticas.', value: 2_600_000_000 },
  { rubro: 'Adecuación de Terreno y Obras Civiles Base', desc: 'Movimiento de tierras, excavaciones, pilotaje, cimentaciones profundas y redes de drenaje primario.', value: 7_800_000_000 },
  { rubro: 'Construcción de Macro-Pabellones (4 unidades)', desc: 'Estructuras metálicas, cubiertas termoacústicas, pisos de alta resistencia e iluminación industrial para 4 módulos principales.', value: 22_100_000_000 },
  { rubro: 'Sistema de Refrigeración y Cuartos Fríos', desc: 'Equipos de refrigeración industrial, aislamiento térmico, cámaras de atmósfera controlada y muelles de carga refrigerados.', value: 11_700_000_000 },
  { rubro: 'Edificio Administrativo y Servicios', desc: 'Oficinas directivas, centro de atención al cliente, áreas bancarias, restaurantes y baterías sanitarias.', value: 4_550_000_000 },
  { rubro: 'Vías Perimetrales y Urbanismo', desc: 'Pavimentación de vías de tráfico pesado, zonas de parqueo, muelles de maniobra, cerramientos y paisajismo.', value: 8_450_000_000 },
  { rubro: 'Redes Hidrosanitarias y Eléctricas', desc: 'Subestaciones eléctricas, plantas de emergencia, PTAR, redes de agua potable y sistemas de extinción de incendios.', value: 4_800_000_000 },
  { rubro: 'Imprevistos y Contingencias', desc: 'Fondo de reserva para variaciones de mercado, imprevistos geotécnicos o ajustes normativos.', value: 3_000_000_000 },
];

export const EXECUTION = {
  rubro: 'Estudios, Diseños y Licencias',
  assigned: 2_600_000_000,
  spent: 850_000_000,
  pct: 32.7,
  note: 'Levantamiento topográfico, ensayos preliminares de suelos y software especializado. Dentro de los parámetros planificados.',
};

export const TEAM = [
  { role: 'Gerencia de Proyecto', names: ['Josue Herrera Quintero'], desc: 'Dirección general, representación estratégica, alineamiento con los grupos de interés y control de hitos y presupuesto.' },
  { role: 'Contabilidad y Finanzas', names: ['Oscar Johanny Garavito Contreras'], desc: 'Estructuración financiera, control presupuestal, contabilidad de costos, liquidez y plan de compras.' },
  { role: 'Diseño, Planos y Arquitectura', names: ['Jhojan David Jacome Montejo', 'David Alejandro Fuentes Hernandez'], desc: 'Desarrollo conceptual, espacial y estructural; modelación arquitectónica, planos constructivos y especificaciones técnicas.' },
  { role: 'Sostenibilidad y Riesgos', names: ['María Jose Herrera Bonilla'], desc: 'Impacto ambiental, desarrollo sostenible, eficiencia energética y mitigación de riesgos operativos, financieros y normativos.' },
];

export const METHOD = [
  'Marco ágil Scrum con sprints semanales (planos, presupuestos y matrices).',
  'Backlogs y seguimiento centralizados en Atlassian Jira.',
  'Repositorio único en la nube para trazabilidad de planos y documentos.',
  'Maqueta: diseño en AutoCAD, corte láser, cartón corrugado y cartón paja.',
];

export const SCHEDULE = [
  { id: 'H-01', desc: 'Diseños arquitectónicos finales y planos de ingeniería', date: '29 sep' },
  { id: 'H-02', desc: 'Cierre de estudios financieros, presupuesto y plan de compras', date: '01 oct' },
  { id: 'H-03', desc: 'Consolidación del informe escrito final', date: '03 oct' },
  { id: 'H-04', desc: 'Entrega única del proyecto (documentación completa)', date: '06 oct' },
  { id: 'H-05', desc: 'Sustentación final ante evaluadores', date: '13 oct' },
];

export const LOG = [
  { date: '02 sep', act: 'Definición del alcance técnico y redimensionamiento a $65.000 M', who: 'Josue Herrera' },
  { date: '08 sep', act: 'Presupuesto desglosado y plan de adquisiciones', who: 'Oscar Garavito' },
  { date: '15 sep', act: 'Esquemas arquitectónicos y distribución de macro-pabellones', who: 'Jhojan Jacome / David Fuentes' },
  { date: '21 sep', act: 'Matriz de riesgos y criterios de sostenibilidad', who: 'María José Herrera' },
  { date: '28 sep', act: 'Integración de entregables del 2.º corte y revisión en Jira', who: 'Josue Herrera' },
];

export const RISKS = [
  { event: 'Sobrecosto en insumos estructurales', prob: 'Alta', impact: 'Alto', plan: 'Contratos a precio cerrado y alianzas con proveedores de acero y hormigón.' },
  { event: 'Retraso en licencias ambientales', prob: 'Media', impact: 'Alto', plan: 'Trámite anticipado del plan de manejo ambiental y acompañamiento técnico con la autoridad.' },
  { event: 'Inestabilidad del terreno para cuartos fríos', prob: 'Baja', impact: 'Alto', plan: 'Geotecnia profunda y cimentaciones especiales con aislantes térmicos inferiores.' },
  { event: 'Desalineación en entregables del equipo', prob: 'Media', impact: 'Medio', plan: 'Monitoreo diario en tableros Jira y revisiones al cierre de cada sprint.' },
];

export const ODS = [
  { n: 2, name: 'Hambre Cero', color: '#DDA63A', desc: 'Reduce pérdidas de alimentos y mejora su disponibilidad, calidad y vida útil.' },
  { n: 3, name: 'Salud y Bienestar', color: '#4C9F38', desc: 'Mejores condiciones sanitarias en la manipulación y transporte de alimentos.' },
  { n: 8, name: 'Trabajo Decente y Crecimiento Económico', color: '#A21942', desc: 'Empleo directo e indirecto y dinamización de productores y comerciantes.' },
  { n: 9, name: 'Industria, Innovación e Infraestructura', color: '#FD6925', desc: 'Infraestructura logística moderna y resiliente a escala regional.' },
  { n: 11, name: 'Ciudades y Comunidades Sostenibles', color: '#FD9D24', desc: 'Ordena el transporte y la distribución, reduciendo congestión en el espacio público.' },
  { n: 12, name: 'Producción y Consumo Responsables', color: '#BF8B2E', desc: 'Mejor cadena de frío, compostaje y correcta separación de residuos.' },
];

export const fmtCOP = (v) => '$' + Math.round(v).toLocaleString('es-CO');
export const fmtM = (v) => {
  if (v >= 1e9) return '$' + (v / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' mil M';
  return '$' + (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' M';
};
