export type OrigenSonido = 'Naturaleza' | 'Actividad humana';

export interface PuntoSonoro {
  id: string;
  nombre_punto: string;
  latitud: number;
  longitud: number;
  sonido_observado: string;
  hora_observacion: string;
  origen_sonido: OrigenSonido;
  created_at?: string;
}

export interface PuntoSonoroInput {
  nombre_punto: string;
  latitud: string;
  longitud: string;
  sonido_observado: string;
  hora_observacion: string;
  origen_sonido: OrigenSonido;
}

export interface ValidationErrors {
  nombre_punto?: string;
  latitud?: string;
  longitud?: string;
  sonido_observado?: string;
  hora_observacion?: string;
  origen_sonido?: string;
}

export function normalizeOrigen(raw: unknown): OrigenSonido {
  const val = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (val.includes('natur')) {
    return 'Naturaleza';
  }
  return 'Actividad humana';
}

export function parseStrictDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(trimmed)) {
    return null;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function validatePuntoInput(input: PuntoSonoroInput): {
  valid: boolean;
  errors: ValidationErrors;
  parsed?: Omit<PuntoSonoro, 'id' | 'created_at'>;
} {
  const errors: ValidationErrors = {};

  const nombre = input.nombre_punto.trim();
  if (!nombre) {
    errors.nombre_punto = 'El nombre del punto de observación es obligatorio.';
  }

  const sonido = input.sonido_observado.trim();
  if (!sonido) {
    errors.sonido_observado = 'Describí el sonido observado en el lugar.';
  }

  const hora = input.hora_observacion.trim();
  if (!hora) {
    errors.hora_observacion = 'Indicá la hora de observación (ej. 07:30).';
  }

  if (input.origen_sonido !== 'Naturaleza' && input.origen_sonido !== 'Actividad humana') {
    errors.origen_sonido = 'Seleccioná un origen válido: Naturaleza o Actividad humana.';
  }

  const latRaw = input.latitud.trim();
  let latNum: number | null = null;
  if (!latRaw) {
    errors.latitud = 'La latitud es obligatoria y no puede quedar vacía.';
  } else {
    latNum = parseStrictDecimal(latRaw);
    if (latNum === null) {
      errors.latitud =
        'La latitud debe ser un número decimal válido sin letras ni símbolos (ej. -25.2867).';
    } else if (latNum < -90 || latNum > 90) {
      errors.latitud = `Latitud rechazada (${latNum}): el valor en grados decimales debe estar entre -90 y 90.`;
    }
  }

  const lngRaw = input.longitud.trim();
  let lngNum: number | null = null;
  if (!lngRaw) {
    errors.longitud = 'La longitud es obligatoria y no puede quedar vacía.';
  } else {
    lngNum = parseStrictDecimal(lngRaw);
    if (lngNum === null) {
      errors.longitud =
        'La longitud debe ser un número decimal válido sin letras ni símbolos (ej. -57.6470).';
    } else if (lngNum < -180 || lngNum > 180) {
      errors.longitud = `Longitud rechazada (${lngNum}): el valor en grados decimales debe estar entre -180 y 180.`;
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  if (hasErrors || latNum === null || lngNum === null) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    parsed: {
      nombre_punto: nombre,
      latitud: latNum,
      longitud: lngNum,
      sonido_observado: sonido,
      hora_observacion: hora,
      origen_sonido: input.origen_sonido,
    },
  };
}

export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}
