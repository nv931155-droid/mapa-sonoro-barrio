# Mapa sonoro del barrio (19 C)

Aplicación web para el **Club de Ciencias** que gestiona registros acústicos georreferenciados en **Supabase** y representa sus coordenadas GPS en **Google Maps**.

## Funcionalidades implementadas

- **CRUD conectado a Supabase**: Crear, listar, editar y eliminar puntos sonoros (`id`, `nombre_punto`, `latitud`, `longitud`, `sonido_observado`, `hora_observacion`, `origen_sonido`).
- **Filtro por origen del sonido**: Segmentación entre **Todos**, **Naturaleza** y **Actividad humana**, diferenciando visualmente los marcadores en Google Maps y los registros en la lista.
- **Validación estricta de coordenadas**: Rechaza valores vacíos, no numéricos o fuera de rango en grados decimales (`latitud` de `-90` a `90` y `longitud` de `-180` a `180`), tanto en el navegador como en el servidor Express.
- **Integración con Google Maps (`@vis.gl/react-google-maps`)**: Al seleccionar un punto, el mapa se centra y abre su ficha (`InfoWindow`) sobre un marcador avanzado (`AdvancedMarkerElement`). También permite comparar 2 puntos simultáneamente y calcular la distancia entre ellos.

## Variables de entorno requeridas

Copiá `.env.example` a `.env` (en local) o cargalas en **Render → Environment Variables**:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_TABLE=puntos_sonoros
VITE_GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps
```

## Tabla en Supabase

```sql
create table if not exists public.puntos_sonoros (
  id bigint generated always as identity primary key,
  nombre_punto text not null,
  latitud double precision not null check (latitud >= -90 and latitud <= 90),
  longitud double precision not null check (longitud >= -180 and longitud <= 180),
  sonido_observado text not null,
  hora_observacion text not null,
  origen_sonido text not null check (origen_sonido in ('Naturaleza', 'Actividad humana')),
  created_at timestamptz default now()
);
```

## Despliegue en Render

1. Subí este repositorio a GitHub.
2. En Render creá un **Web Service** conectado al repositorio:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Configurá `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_TABLE` y `VITE_GOOGLE_MAPS_API_KEY` en las variables de entorno de Render.

## Consulta a Gemini en Google AI Studio, aplicación y prueba (Requisito de entrega)

- **Consulta realizada a Gemini**: *"Necesito crear una aplicación web para el mapa sonoro del barrio conectada a mi tabla de Supabase y a Google Maps, con filtro por origen del sonido (Naturaleza / Actividad humana), edición de coordenadas y rechazo de latitudes fuera de rango como 95."*
- **Sugerencia aplicada / corregida**: Se implementó un servidor Express (`/api/puntos`) conectado a `@supabase/supabase-js` con detección automática de columnas y validación doble (cliente y servidor) de coordenadas en grados decimales, junto con `@vis.gl/react-google-maps` usando `AdvancedMarker` e `InfoWindow`. Además se agregó el modo de comparación de dos registros para visualizar su ubicación y distancia en el mapa.
- **Prueba de verificación realizada**:
  1. Se cargaron tres registros de prueba cubriendo **Naturaleza** (canto de aves en la plaza) y **Actividad humana** (tránsito vehicular).
  2. Se probaron ambas opciones del filtro y se compararon dos ubicaciones en Google Maps.
  3. Se corrigieron las coordenadas del canto de aves desde la calle hacia el interior de la plaza, se guardó en Supabase, se recargó la página (`F5`) y se comprobó el desplazamiento del marcador al volver a seleccionarlo.
  4. Se intentó guardar una latitud de `95` y se verificó el rechazo con el mensaje de error indicando que el rango válido es de `-90` a `90`.
