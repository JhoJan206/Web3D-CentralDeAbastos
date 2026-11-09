// Distribución general. 1 unidad = 1 metro.
// Ejes: X a lo largo de la autopista (Girón ← → Bucaramanga), Z hacia la autopista (+Z = frente), Y arriba.

// Polígono del predio [x, z] (frente 320 m sobre la autopista, lado derecho 220 m, fondo inclinado)
export const SITE = [
  [-160, 105],
  [160, 105],
  [160, -150],
  [-150, -125],
];

// Línea de fondo del predio: z en función de x
export const backEdgeZ = (x) => -125 - (25 * (x + 150)) / 310;

export const HIGHWAY = {
  near: { z0: 113, z1: 127, dir: 1 }, // calzada hacia Bucaramanga
  median: { z0: 127, z1: 132 },
  far: { z0: 132, z1: 146, dir: -1 }, // calzada hacia Girón
};

export const ENTRANCES = [
  { id: 'general', label: 'Entrada general (vehículos)', x: -22, width: 18 },
  { id: 'carga', label: 'Entrada de carga (tractomulas)', x: 124, width: 20 },
];

export const PARKING = {
  visitors: { x0: -148, x1: -40, z0: 58, z1: 98 },
  trucks: { x0: 2, x1: 104, z0: 64, z1: 98 },
};

export const BUILDINGS = [
  {
    id: 'p1',
    short: 'P1',
    name: 'Pabellón 1',
    subtitle: 'Frutas y Verduras',
    type: 'gable',
    cx: -96.5, cz: -21, w: 75, d: 122, eave: 11, ridge: 17,
    docks: { front: 0, back: 8 },
    publicFront: true,
    accent: '#7cb342',
    description:
      'El pabellón de mayor tamaño. Concentra la comercialización mayorista y minorista de productos frescos con una retícula de puestos modulares de 5,8 m, locales perimetrales y amplios pasillos de circulación. Su acceso principal da al parqueadero de visitantes y público.',
    zones: ['Puestos modulares (5,8 m × 5,8 m)', 'Locales comerciales perimetrales', 'Pasillos centrales de circulación', 'Muelles de carga y descarga posteriores', 'Acceso peatonal desde el parqueadero'],
    budgetRef: 2,
  },
  {
    id: 'p2',
    short: 'P2',
    name: 'Pabellón 2',
    subtitle: 'Carne y Lácteos',
    type: 'gable',
    cx: -16.5, cz: -15, w: 65, d: 102, eave: 10, ridge: 15,
    docks: { front: 7, back: 7 },
    accent: '#e57373',
    description:
      'Pabellón con cadena de frío. Integra cámaras de refrigeración industrial, vitrinas refrigeradas para la venta y dos zonas de pre-alistamiento donde se clasifica y empaca el producto antes del despacho por los muelles refrigerados.',
    zones: ['Cámaras de refrigeración (atmósfera controlada)', 'Vitrinas refrigeradas de venta', 'Zonas de pre-alistamiento', 'Muelles de carga refrigerados (frente y fondo)'],
    budgetRef: 3,
  },
  {
    id: 'p3',
    short: 'P3',
    name: 'Pabellón 3',
    subtitle: 'Granos y Abarrotes',
    type: 'gable',
    cx: 46, cz: -15, w: 40, d: 102, eave: 9, ridge: 13,
    docks: { front: 5, back: 5 },
    accent: '#ffb74d',
    description:
      'Bodega y punto de venta de productos secos: granos, harinas, enlatados y abarrotes. Combina estanterías industriales tipo rack para almacenamiento en estibas con bodegas comerciales de venta al por mayor.',
    zones: ['Estanterías industriales tipo rack', 'Bodegas comerciales de abarrotes', 'Pasillo de montacargas', 'Muelles de carga y descarga (frente y fondo)'],
    budgetRef: 2,
  },
  {
    id: 'admin',
    short: 'ADM',
    name: 'Edificio Administrativo',
    subtitle: 'y Servicios',
    type: 'flat',
    cx: 88, cz: -5, w: 20, d: 82, eave: 8, ridge: 8,
    floors: 2,
    docks: { front: 0, back: 0 },
    accent: '#64b5f6',
    description:
      'Edificio central de gestión: gerencia, administración, caja, control de calidad, recepción, salas de reuniones y baterías sanitarias. Atiende a comerciantes, proveedores y visitantes, y aloja los servicios de atención al cliente y áreas bancarias.',
    zones: ['Gerencia', 'Salas de reuniones', 'Caja y área bancaria', 'Administración', 'Control de calidad', 'Recepción y atención al cliente', 'Baterías sanitarias'],
    budgetRef: 4,
  },
  {
    id: 'p4',
    short: 'P4',
    name: 'Pabellón 4',
    subtitle: 'Suministro Institucional',
    type: 'gable',
    cx: 125, cz: 0, w: 30, d: 72, eave: 8, ridge: 12,
    docks: { front: 3, back: 4 },
    accent: '#ba68c8',
    description:
      'Centro de alistamiento y despacho de pedidos para clientes institucionales (colegios, hospitales, comedores). Pedidos consolidados en estibas, zona de picking y muelles directos hacia la entrada de carga.',
    zones: ['Zona de picking y alistamiento', 'Pedidos consolidados en estibas', 'Estanterías de almacenamiento', 'Muelles de despacho institucional'],
    budgetRef: 2,
  },
];

export const SERVICE_ZONES = [
  { id: 'sub', label: 'Subestación eléctrica y planta de emergencia', x0: -110, x1: -70 },
  { id: 'solar', label: 'Paneles solares', x0: -55, x1: 15 },
  { id: 'waste', label: 'Gestión de residuos y compostaje', x0: 25, x1: 92 },
  { id: 'tanks', label: 'Tanques de agua potable y contra incendios', x0: 102, x1: 150 },
];
export const SERVICE_Z = { z0: -128, z1: -111 };
