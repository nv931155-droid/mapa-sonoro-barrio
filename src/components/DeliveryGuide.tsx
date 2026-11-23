import { CheckCircle2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const SQL_SNIPPET = `create table if not exists public.puntos_sonoros (
  id bigint generated always as identity primary key,
  nombre_punto text not null,
  latitud double precision not null check (latitud >= -90 and latitud <= 90),
  longitud double precision not null check (longitud >= -180 and longitud <= 180),
  sonido_observado text not null,
  hora_observacion text not null,
  origen_sonido text not null check (origen_sonido in ('Naturaleza', 'Actividad humana')),
  created_at timestamptz default now()
);

-- Si usás RLS en Supabase, habilitá lectura/escritura o usá la Service Role Key en el servidor:
alter table public.puntos_sonoros enable row level security;
drop policy if exists "Permitir acceso público al club de ciencias" on public.puntos_sonoros;
create policy "Permitir acceso público al club de ciencias"
  on public.puntos_sonoros for all
  using (true)
  with check (true);`;

const ENV_SNIPPET = `SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_TABLE=puntos_sonoros
VITE_GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps`;

const DEMO_STEPS = [
  'Cargá al menos 3 puntos distintos (ej. un canto de aves en una plaza, una esquina transitada y un parque), cubriendo ambas opciones: Naturaleza y Actividad humana.',
  'Probá el filtro por origen del sonido (Todos / Naturaleza / Actividad humana) y verificá que tanto el listado como los marcadores del mapa distinguen ambas opciones.',
  'Activá "Comparar" en dos registros distintos para visualizar ambos marcadores simultáneamente y comparar sus coordenadas y distancia.',
  'Editá el registro del canto de aves que quedó sobre la calle: corregí sus coordenadas hacia el interior de la plaza, guardá en Supabase, recargá la página (F5) y volvé a seleccionarlo para mostrar el desplazamiento del marcador.',
  'Intentá guardar una latitud de 95 (o dejala vacía o escribí texto) y explicá por qué el sistema la rechaza: las latitudes válidas en grados decimales solo van de -90° a 90°.',
];

export function DeliveryGuide() {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const handleCopy = async (text: string, type: 'sql' | 'env') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'sql') {
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 1800);
      } else {
        setCopiedEnv(true);
        setTimeout(() => setCopiedEnv(false), 1800);
      }
    } catch {
      // Clipboard API may be restricted in some iframes
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-blue-700">
          2.º BTI · Software y Laboratorio · Versión C
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-950">
          Guía de conexión a Supabase y demostración en Render
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
          Verificá que tu tabla en Supabase coincida con los campos del tema y
          seguí los pasos de prueba requeridos para la evaluación práctica.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-950">
              1. Estructura de tabla en Supabase
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(SQL_SNIPPET, 'sql')}
              className="inline-flex items-center gap-1.5 border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              {copiedSql ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar SQL
                </>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            El servidor detecta automáticamente tus columnas si usaste nombres
            como <code className="font-mono text-slate-900">nombre_punto</code>{' '}
            o <code className="font-mono text-slate-900">nombre</code>,{' '}
            <code className="font-mono text-slate-900">latitud</code> o{' '}
            <code className="font-mono text-slate-900">lat</code>. Si querés
            recrear o verificar tu tabla, usá este SQL en el SQL Editor de
            Supabase:
          </p>
          <pre className="mt-3 overflow-x-auto border border-slate-200 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-100">
            {SQL_SNIPPET}
          </pre>
        </section>

        <section className="border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-950">
              2. Variables de entorno (AI Studio y Render)
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(ENV_SNIPPET, 'env')}
              className="inline-flex items-center gap-1.5 border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              {copiedEnv ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar variables
                </>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Agregá estas variables en{' '}
            <strong className="font-semibold text-slate-900">
              Settings → Secrets
            </strong>{' '}
            (en AI Studio) y en{' '}
            <strong className="font-semibold text-slate-900">
              Environment Variables
            </strong>{' '}
            al crear tu Web Service en Render. Si tu tabla tiene otro nombre,
            ajustá <code className="font-mono text-slate-900">SUPABASE_TABLE</code>.
          </p>
          <pre className="mt-3 overflow-x-auto border border-slate-200 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-100">
            {ENV_SNIPPET}
          </pre>
          <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">
              Comandos para Render (Web Service):
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-700">
              Build Command: npm install && npm run build
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-700">
              Start Command: npm start
            </p>
          </div>
        </section>
      </div>

      <section className="mt-8 border border-slate-200 bg-white p-5">
        <h2 className="font-display text-base font-semibold text-slate-950">
          3. Lista de verificación para la demostración
        </h2>
        <ol className="mt-4 space-y-3">
          {DEMO_STEPS.map((step, index) => (
            <li
              key={index}
              className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <span className="text-sm leading-relaxed text-slate-700">
                <strong className="font-mono text-xs text-slate-900">
                  0{index + 1}.
                </strong>{' '}
                {step}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
