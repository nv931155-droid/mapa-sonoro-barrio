import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanEnv = (val?: string) =>
  (val || '').trim().replace(/^["']|["']$/g, '');

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL).replace(/\/+$/, '');
const SUPABASE_KEY = cleanEnv(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY
);
const SUPABASE_TABLE = cleanEnv(process.env.SUPABASE_TABLE) || 'puntos_sonoros';

type ColumnMap = {
  id: string;
  nombre_punto: string;
  latitud: string;
  longitud: string;
  sonido_observado: string;
  hora_observacion: string;
  origen_sonido: string;
};

const DEFAULT_COLUMNS: ColumnMap = {
  id: 'id',
  nombre_punto: 'nombre_punto',
  latitud: 'latitud',
  longitud: 'longitud',
  sonido_observado: 'sonido_observado',
  hora_observacion: 'hora_observacion',
  origen_sonido: 'origen_sonido',
};

let cachedColumns: ColumnMap | null = null;
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

function matchColumn(
  available: string[],
  candidates: string[],
  fallback: string
): string {
  const lowerLookup: Record<string, string> = {};
  for (const col of available) {
    lowerLookup[col.toLowerCase()] = col;
  }
  for (const candidate of candidates) {
    const found = lowerLookup[candidate.toLowerCase()];
    if (found) return found;
  }
  return fallback;
}

async function resolveTableColumns(forceRefresh = false): Promise<ColumnMap> {
  if (cachedColumns && !forceRefresh) return cachedColumns;
  if (!SUPABASE_URL || !SUPABASE_KEY) return DEFAULT_COLUMNS;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return DEFAULT_COLUMNS;
    const spec = (await res.json()) as {
      definitions?: Record<string, { properties?: Record<string, unknown> }>;
    };
    const tableDef = spec.definitions?.[SUPABASE_TABLE];
    if (!tableDef?.properties) return DEFAULT_COLUMNS;
    const cols = Object.keys(tableDef.properties);

    cachedColumns = {
      id: matchColumn(cols, ['id', 'punto_id', 'uuid'], 'id'),
      nombre_punto: matchColumn(
        cols,
        ['nombre_punto', 'nombre', 'punto', 'lugar', 'sitio', 'name', 'title'],
        'nombre_punto'
      ),
      latitud: matchColumn(cols, ['latitud', 'lat', 'latitude'], 'latitud'),
      longitud: matchColumn(
        cols,
        ['longitud', 'lng', 'lon', 'long', 'longitude'],
        'longitud'
      ),
      sonido_observado: matchColumn(
        cols,
        ['sonido_observado', 'sonido', 'observacion', 'descripcion', 'sound'],
        'sonido_observado'
      ),
      hora_observacion: matchColumn(
        cols,
        ['hora_observacion', 'hora', 'horario', 'time'],
        'hora_observacion'
      ),
      origen_sonido: matchColumn(
        cols,
        ['origen_sonido', 'origen', 'tipo_origen', 'tipo', 'source'],
        'origen_sonido'
      ),
    };
    return cachedColumns;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

function normalizeOrigen(raw: unknown): 'Naturaleza' | 'Actividad humana' {
  const val = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (val.includes('natur')) return 'Naturaleza';
  return 'Actividad humana';
}

function mapRowToPunto(row: Record<string, unknown>, cols: ColumnMap) {
  const idVal = row[cols.id] ?? row.id;
  const nombreVal =
    row[cols.nombre_punto] ?? row.nombre_punto ?? row.nombre ?? '';
  const latVal = row[cols.latitud] ?? row.latitud ?? row.lat;
  const lngVal = row[cols.longitud] ?? row.longitud ?? row.lng ?? row.lon;
  const sonidoVal =
    row[cols.sonido_observado] ?? row.sonido_observado ?? row.sonido ?? '';
  const horaVal =
    row[cols.hora_observacion] ?? row.hora_observacion ?? row.hora ?? '';
  const origenVal =
    row[cols.origen_sonido] ?? row.origen_sonido ?? row.origen ?? '';

  return {
    id: String(idVal ?? ''),
    nombre_punto: String(nombreVal ?? ''),
    latitud: Number(latVal),
    longitud: Number(lngVal),
    sonido_observado: String(sonidoVal ?? ''),
    hora_observacion: String(horaVal ?? ''),
    origen_sonido: normalizeOrigen(origenVal),
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

function parseStrictDecimal(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  const trimmed = String(raw ?? '')
    .trim()
    .replace(',', '.');
  if (!trimmed) return null;
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(trimmed)) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function validateBody(body: Record<string, unknown>): {
  error?: string;
  data?: {
    nombre_punto: string;
    latitud: number;
    longitud: number;
    sonido_observado: string;
    hora_observacion: string;
    origen_sonido: 'Naturaleza' | 'Actividad humana';
  };
} {
  const nombre = String(body.nombre_punto ?? '').trim();
  const sonido = String(body.sonido_observado ?? '').trim();
  const hora = String(body.hora_observacion ?? '').trim();
  const origenRaw = String(body.origen_sonido ?? '').trim();

  if (!nombre) {
    return { error: 'El nombre del punto es obligatorio.' };
  }
  if (!sonido) {
    return { error: 'El campo sonido observado es obligatorio.' };
  }
  if (!hora) {
    return { error: 'La hora de observación es obligatoria.' };
  }
  if (origenRaw !== 'Naturaleza' && origenRaw !== 'Actividad humana') {
    return {
      error: 'El origen del sonido debe ser "Naturaleza" o "Actividad humana".',
    };
  }

  const lat = parseStrictDecimal(body.latitud);
  if (lat === null) {
    return {
      error:
        'La latitud no puede estar vacía y debe ser un número en grados decimales.',
    };
  }
  if (lat < -90 || lat > 90) {
    return {
      error: `Latitud fuera de rango (${lat}): debe estar entre -90 y 90 grados decimales.`,
    };
  }

  const lng = parseStrictDecimal(body.longitud);
  if (lng === null) {
    return {
      error:
        'La longitud no puede estar vacía y debe ser un número en grados decimales.',
    };
  }
  if (lng < -180 || lng > 180) {
    return {
      error: `Longitud fuera de rango (${lng}): debe estar entre -180 y 180 grados decimales.`,
    };
  }

  return {
    data: {
      nombre_punto: nombre,
      latitud: lat,
      longitud: lng,
      sonido_observado: sonido,
      hora_observacion: hora,
      origen_sonido: origenRaw,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/maps-config', (_req: Request, res: Response) => {
    const apiKey = (
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ''
    ).trim();
    res.json({ apiKey });
  });

  app.get('/api/health', async (_req: Request, res: Response) => {
    const client = getSupabase();
    if (!client) {
      res.status(503).json({
        configured: false,
        table: SUPABASE_TABLE,
        message:
          'Faltan las variables SUPABASE_URL y SUPABASE_ANON_KEY en el entorno del servidor.',
      });
      return;
    }

    const { error } = await client
      .from(SUPABASE_TABLE)
      .select('*', { count: 'exact', head: true });

    if (error) {
      res.status(500).json({
        configured: true,
        connected: false,
        table: SUPABASE_TABLE,
        message: `Error al consultar la tabla "${SUPABASE_TABLE}" en Supabase: ${error.message}`,
      });
      return;
    }

    res.json({
      configured: true,
      connected: true,
      table: SUPABASE_TABLE,
    });
  });

  app.get('/api/puntos', async (req: Request, res: Response) => {
    const client = getSupabase();
    if (!client) {
      res.status(503).json({
        configured: false,
        error:
          'Supabase no está configurado en el servidor. Agregá SUPABASE_URL y SUPABASE_ANON_KEY en las variables de entorno.',
      });
      return;
    }

    const cols = await resolveTableColumns();
    const { data, error } = await client
      .from(SUPABASE_TABLE)
      .select('*')
      .order(cols.id, { ascending: false });

    if (error) {
      res.status(500).json({
        error: `No se pudieron leer los registros de "${SUPABASE_TABLE}": ${error.message}`,
      });
      return;
    }

    let items = (data || []).map((row) =>
      mapRowToPunto(row as Record<string, unknown>, cols)
    );

    const origenFilter = String(req.query.origen || '').trim();
    if (origenFilter === 'Naturaleza' || origenFilter === 'Actividad humana') {
      items = items.filter((item) => item.origen_sonido === origenFilter);
    }

    res.json({ puntos: items, table: SUPABASE_TABLE });
  });

  app.post('/api/puntos', async (req: Request, res: Response) => {
    const client = getSupabase();
    if (!client) {
      res.status(503).json({
        error: 'Supabase no está configurado en el servidor.',
      });
      return;
    }

    const validation = validateBody((req.body || {}) as Record<string, unknown>);
    if (validation.error || !validation.data) {
      res.status(400).json({ error: validation.error || 'Datos inválidos.' });
      return;
    }

    const cols = await resolveTableColumns(true);
    const payload: Record<string, unknown> = {
      [cols.nombre_punto]: validation.data.nombre_punto,
      [cols.latitud]: validation.data.latitud,
      [cols.longitud]: validation.data.longitud,
      [cols.sonido_observado]: validation.data.sonido_observado,
      [cols.hora_observacion]: validation.data.hora_observacion,
      [cols.origen_sonido]: validation.data.origen_sonido,
    };

    const { data, error } = await client
      .from(SUPABASE_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      res.status(500).json({
        error: `Error al guardar en Supabase ("${SUPABASE_TABLE}"): ${error.message}`,
      });
      return;
    }

    res.status(201).json({
      punto: mapRowToPunto(data as Record<string, unknown>, cols),
    });
  });

  app.put('/api/puntos/:id', async (req: Request, res: Response) => {
    const client = getSupabase();
    if (!client) {
      res.status(503).json({
        error: 'Supabase no está configurado en el servidor.',
      });
      return;
    }

    const rawId = String(req.params.id || '').trim();
    if (!rawId) {
      res.status(400).json({ error: 'Falta el ID del registro a editar.' });
      return;
    }

    const validation = validateBody((req.body || {}) as Record<string, unknown>);
    if (validation.error || !validation.data) {
      res.status(400).json({ error: validation.error || 'Datos inválidos.' });
      return;
    }

    const cols = await resolveTableColumns();
    const idFilter: string | number = /^\d+$/.test(rawId)
      ? Number(rawId)
      : rawId;

    const payload: Record<string, unknown> = {
      [cols.nombre_punto]: validation.data.nombre_punto,
      [cols.latitud]: validation.data.latitud,
      [cols.longitud]: validation.data.longitud,
      [cols.sonido_observado]: validation.data.sonido_observado,
      [cols.hora_observacion]: validation.data.hora_observacion,
      [cols.origen_sonido]: validation.data.origen_sonido,
    };

    const { data, error } = await client
      .from(SUPABASE_TABLE)
      .update(payload)
      .eq(cols.id, idFilter)
      .select()
      .single();

    if (error) {
      res.status(500).json({
        error: `Error al actualizar en Supabase: ${error.message}`,
      });
      return;
    }

    res.json({
      punto: mapRowToPunto(data as Record<string, unknown>, cols),
    });
  });

  app.delete('/api/puntos/:id', async (req: Request, res: Response) => {
    const client = getSupabase();
    if (!client) {
      res.status(503).json({
        error: 'Supabase no está configurado en el servidor.',
      });
      return;
    }

    const rawId = String(req.params.id || '').trim();
    if (!rawId) {
      res.status(400).json({ error: 'Falta el ID del registro a eliminar.' });
      return;
    }

    const cols = await resolveTableColumns();
    const idFilter: string | number = /^\d+$/.test(rawId)
      ? Number(rawId)
      : rawId;

    const { error } = await client
      .from(SUPABASE_TABLE)
      .delete()
      .eq(cols.id, idFilter);

    if (error) {
      res.status(500).json({
        error: `Error al eliminar en Supabase: ${error.message}`,
      });
      return;
    }

    res.json({ deleted: true, id: rawId });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mapa Sonoro server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
