// Distribución general tomada del plano acotado. 1 unidad = 1 metro.
// Ejes alineados con los edificios del plano: X hacia la derecha (Bucaramanga), Z hacia la autopista, Y arriba.
// El lindero frontal y la autopista quedan en diagonal, igual que en el plano.

// Polígono del predio [x, z]: frente 320 m, lado derecho 220 m, lado izquierdo ≈ 180 m, fondo ≈ 283 m
export const SITE = [
  [-158, 120.3], // frente izquierda
  [160, 87.5], // frente derecha
  [160, -138.5], // fondo derecha
  [-150, -100], // fondo izquierda (ampliado para la curva de la vía perimetral)
];

// Lindero frontal (sobre la autopista)
export const FRONT = { ox: 2, oz: 103.8, angle: Math.atan2(33, 320) };
export const frontZ = (x) => 120.3 - (33 / 320) * (x + 158);
// Coordenada u (a lo largo de la vía) y v (perpendicular, positiva hacia la autopista)
export const toUV = (x, z) => {
  const c = Math.cos(FRONT.angle), s = Math.sin(FRONT.angle);
  const dx = x - FRONT.ox, dz = z - FRONT.oz;
  return [dx * c - dz * s, dx * s + dz * c];
};
export const fromUV = (u, v) => {
  const c = Math.cos(FRONT.angle), s = Math.sin(FRONT.angle);
  return [FRONT.ox + u * c + v * s, FRONT.oz - u * s + v * c];
};

// Lindero del fondo (ladera)
export const backEdgeZ = (x) => -100 - (40 / 322) * (x + 150);

// Autopista Girón – Bucaramanga (coordenada v desde el lindero frontal)
// 2 carriles por sentido; la calzada cercana gana un 3.er carril frente a los accesos.
export const HIGHWAY = {
  near: { v0: 4, v1: 12, dir: 1 }, // hacia Bucaramanga
  median: { v0: 12, v1: 15.5 },
  far: { v0: 15.5, v1: 23.5, dir: -1 }, // hacia Girón
  aux: { v0: 0.6, v1: 4, u0: -125, u1: 160, taper: 40 }, // carril de aceleración / desaceleración
  lane: 3.5,
};

// Accesos sobre el lindero frontal (u a lo largo de la vía)
export const ENTRANCES = [
  { id: 'general', label: 'Entrada general (vehículos)', u: -51.7, width: 16 },
  { id: 'carga', label: 'Entrada de carga (tractomulas)', u: 86.4, width: 18 },
];

// Vías internas (ejes)
export const ROADS = {
  // anillo perimetral con esquinas redondeadas (izquierda → fondo → derecha → frente)
  back: { z: -80, width: 10 },
  front: { z: 78, width: 10 }, // pasa por delante del P1 atravesando el parqueadero de visitantes
  left: { x: -138, width: 10 },
  right: { x: 147, width: 10 }, // 8 m al costado del P4
  radius: 24,
  radiusFront: 14,
  radiusFrontLeft: 12, // curva frente a la esquina del P1
  p1p2: { x: -50.4, z0: -80, z1: 110, width: 8 }, // vía entre Pabellón 1 y 2 (llega a la entrada general)
  p2p3: { x: 25.9, z0: -80, z1: 76, width: 8 }, // vía entre Pabellón 2 y 3
};

export const PARKING = {
  visitors: { x0: -150, x1: -55 }, // entre la vía perimetral frontal y el lindero, frente al Pabellón 1
  // bahía de camiones en espera, en coordenadas de la autopista (u a lo largo, v hacia la vía; negativo = dentro del predio)
  trucks: { u0: -36, u1: 69, v0: -12.6, v1: -6.2 },
};

export const BUILDINGS = [
  {
    id: 'p1',
    short: 'P1',
    name: 'Pabellón 1',
    subtitle: 'Frutas y Verduras',
    type: 'gable',
    cx: -92.5, cz: 2.5, w: 75, d: 122, eave: 11, ridge: 17,
    docks: { front: 0, back: 8 },
    publicFront: true,
    accent: '#7cb342',
    description:
      'El pabellón de mayor tamaño. Concentra la comercialización mayorista y minorista de productos frescos con una retícula de locales comerciales modulares de 5,8 m, cerrados con muros y mostrador de atención, locales perimetrales y amplios pasillos de circulación. Su acceso principal da al parqueadero de visitantes y público.',
    zones: ['Locales modulares de 5,8 m × 5,8 m con mostrador', 'Locales perimetrales', 'Pasillos centrales de circulación', 'Muelles de carga y descarga posteriores', 'Acceso peatonal desde el parqueadero'],
    budgetRef: 2,
  },
  {
    id: 'p2',
    short: 'P2',
    name: 'Pabellón 2',
    subtitle: 'Carne y Lácteos',
    type: 'gable',
    cx: -13.3, cz: -5.1, w: 65, d: 102, eave: 10, ridge: 15,
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
    cx: 52.6, cz: -5.1, w: 40, d: 102, eave: 9, ridge: 13,
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
    cx: 89, cz: 3.2, w: 20, d: 82, eave: 5, ridge: 5, // un solo piso; separado del P3 solo por un paso peatonal
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
    cx: 118, cz: -17.1, w: 30, d: 72, eave: 8, ridge: 12, // 4 m al costado del Administrativo
    docks: { front: 3, back: 3 },
    accent: '#ba68c8',
    description:
      'Centro de alistamiento y despacho de pedidos para clientes institucionales (colegios, hospitales, comedores). Pedidos consolidados en estibas, zona de picking y muelles directos hacia la entrada de carga.',
    zones: ['Zona de picking y alistamiento', 'Pedidos consolidados en estibas', 'Estanterías de almacenamiento', 'Muelles de despacho institucional'],
    budgetRef: 2,
  },
  // ---- Edificios de servicios: en hilera, pegados entre sí y a la vía perimetral del fondo ----
  {
    id: 'sub',
    short: 'SUB',
    name: 'Subestación eléctrica',
    subtitle: 'y planta de emergencia',
    type: 'service',
    roofed: true,
    cx: 27, cz: -95.3, w: 14, d: 20, eave: 5, ridge: 5,
    docks: { front: 0, back: 0 },
    gate: 4,
    accent: '#fdd835',
    description: 'Recibe la acometida de media tensión y alimenta toda la central. Cuenta con transformadores, celdas de maniobra y una planta eléctrica de emergencia para mantener la cadena de frío.',
    zones: ['Transformadores de potencia', 'Celdas de media tensión', 'Tableros de distribución', 'Planta eléctrica de emergencia'],
    budgetRef: 6,
  },
  {
    id: 'rec',
    short: 'REC',
    name: 'Separación y reciclaje',
    subtitle: 'de residuos',
    type: 'service',
    cx: 54, cz: -95.3, w: 40, d: 20, eave: 4, ridge: 4,
    docks: { front: 0, back: 0 },
    gate: 8,
    accent: '#26a69a',
    description: 'Recibe los residuos de los pabellones y los separa por tipo: cartón, plástico, vidrio y metales se compactan en pacas para su venta a recicladores; lo orgánico pasa a compostaje.',
    zones: ['Banda de separación manual', 'Compactadora de pacas', 'Contenedores por tipo de material', 'Patio de maniobra de camiones'],
    budgetRef: 1,
  },
  {
    id: 'com',
    short: 'COM',
    name: 'Compostaje',
    subtitle: 'Residuos orgánicos',
    type: 'service',
    cx: 95, cz: -95.3, w: 42, d: 20, eave: 3, ridge: 3,
    docks: { front: 0, back: 0 },
    gate: 8,
    accent: '#8d6e63',
    description: 'Transforma los residuos orgánicos de frutas y verduras en abono. Las pilas se voltean periódicamente hasta obtener compost maduro, que se tamiza y empaca.',
    zones: ['Bahías de compostaje', 'Pilas en maduración', 'Zona de tamizado y empaque'],
    budgetRef: 1,
  },
  {
    id: 'tan',
    short: 'TAN',
    name: 'Tanques de agua',
    subtitle: 'Potable y contra incendios',
    type: 'service',
    cx: 133, cz: -95.3, w: 34, d: 20, eave: 3, ridge: 3,
    docks: { front: 0, back: 0 },
    gate: 6,
    accent: '#42a5f5',
    description: 'Reserva de agua potable para toda la central y reserva exclusiva para la red contra incendios, con su cuarto de bombas.',
    zones: ['Tanque de agua potable', 'Tanque de la red contra incendios', 'Cuarto de bombas'],
    budgetRef: 6,
  },
];
