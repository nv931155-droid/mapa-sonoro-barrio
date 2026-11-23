import { useCallback, useEffect, useMemo } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { AlertTriangle, Crosshair, Trees, Volume2, X } from 'lucide-react';
import type { PuntoSonoro } from '../types/sound.ts';
import { haversineDistanceMeters } from '../types/sound.ts';

// Default center: Asunción, Paraguay (can pan automatically to loaded points)
const DEFAULT_CENTER = { lat: -25.2867, lng: -57.647 };
const DEFAULT_ZOOM = 14;

interface SoundMapProps {
  apiKey: string;
  puntos: PuntoSonoro[];
  selectedId: string | null;
  compareIds: string[];
  pickOnMapActive: boolean;
  onSelectPunto: (id: string | null) => void;
  onPickCoordinates: (lat: number, lng: number) => void;
  onClearCompare: () => void;
}

interface MarkerItemProps {
  punto: PuntoSonoro;
  isSelected: boolean;
  isCompared: boolean;
  onSelect: (id: string) => void;
  onCloseInfo: () => void;
}

function MarkerItem({
  punto,
  isSelected,
  isCompared,
  onSelect,
  onCloseInfo,
}: MarkerItemProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isNature = punto.origen_sonido === 'Naturaleza';

  const pinColors = isNature
    ? {
        background: isSelected ? '#065f46' : '#059669',
        borderColor: isSelected ? '#022c22' : '#047857',
        glyphColor: '#ffffff',
      }
    : {
        background: isSelected ? '#92400e' : '#d97706',
        borderColor: isSelected ? '#451a03' : '#b45309',
        glyphColor: '#ffffff',
      };

  const scale = isSelected ? 1.25 : isCompared ? 1.15 : 1;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: punto.latitud, lng: punto.longitud }}
        title={punto.nombre_punto}
        zIndex={isSelected ? 30 : isCompared ? 20 : 10}
        onClick={() => onSelect(punto.id)}
      >
        <Pin
          background={pinColors.background}
          borderColor={pinColors.borderColor}
          glyphColor={pinColors.glyphColor}
          scale={scale}
          glyphText={isNature ? 'N' : 'H'}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={280}
          onCloseClick={onCloseInfo}
        >
          <div className="p-1 text-slate-900">
            <p className="text-sm font-semibold leading-snug text-slate-950">
              {punto.nombre_punto}
            </p>
            <p className="mt-1 text-xs text-slate-700">{punto.sonido_observado}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span
                className={
                  isNature
                    ? 'font-medium text-emerald-700'
                    : 'font-medium text-amber-700'
                }
              >
                {punto.origen_sonido}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {punto.hora_observacion}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
              {punto.latitud.toFixed(6)}, {punto.longitud.toFixed(6)}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface CameraControllerProps {
  puntos: PuntoSonoro[];
  selectedId: string | null;
  compareIds: string[];
}

function CameraController({
  puntos,
  selectedId,
  compareIds,
}: CameraControllerProps) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  const selectedPunto = useMemo(
    () => puntos.find((p) => p.id === selectedId) || null,
    [puntos, selectedId]
  );

  const comparedPuntos = useMemo(
    () => puntos.filter((p) => compareIds.includes(p.id)),
    [puntos, compareIds]
  );

  useEffect(() => {
    if (!map) return;

    if (comparedPuntos.length === 2 && coreLib) {
      const bounds = new coreLib.LatLngBounds();
      comparedPuntos.forEach((p) => {
        bounds.extend({ lat: p.latitud, lng: p.longitud });
      });
      map.fitBounds(bounds, { top: 72, right: 48, bottom: 110, left: 48 });
      return;
    }

    if (selectedPunto) {
      map.panTo({ lat: selectedPunto.latitud, lng: selectedPunto.longitud });
      const currentZoom = map.getZoom() ?? DEFAULT_ZOOM;
      if (currentZoom < 16) {
        map.setZoom(16);
      }
      return;
    }

    if (puntos.length > 0 && !selectedId) {
      if (puntos.length === 1) {
        map.panTo({ lat: puntos[0].latitud, lng: puntos[0].longitud });
        map.setZoom(16);
      } else if (coreLib) {
        const bounds = new coreLib.LatLngBounds();
        puntos.forEach((p) => {
          bounds.extend({ lat: p.latitud, lng: p.longitud });
        });
        map.fitBounds(bounds, { top: 56, right: 56, bottom: 56, left: 56 });
      }
    }
  }, [map, coreLib, selectedPunto, comparedPuntos, puntos, selectedId]);

  return null;
}

function MapStatusOverlay() {
  const status = useApiLoadingStatus();

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50/95 p-6">
        <div className="max-w-md border border-rose-200 bg-white p-5 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-rose-600" />
          <h3 className="mt-2 font-display text-base font-semibold text-slate-900">
            No se pudo inicializar Google Maps
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Verificá que la clave de Google Maps Platform esté habilitada y con
            permisos para Maps JavaScript API.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function SoundMap({
  apiKey,
  puntos,
  selectedId,
  compareIds,
  pickOnMapActive,
  onSelectPunto,
  onPickCoordinates,
  onClearCompare,
}: SoundMapProps) {
  const comparedPuntos = useMemo(
    () => puntos.filter((p) => compareIds.includes(p.id)),
    [puntos, compareIds]
  );

  const selectedPunto = useMemo(
    () => puntos.find((p) => p.id === selectedId) || null,
    [puntos, selectedId]
  );

  const comparisonDistance = useMemo(() => {
    if (comparedPuntos.length !== 2) return null;
    return haversineDistanceMeters(
      { lat: comparedPuntos[0].latitud, lng: comparedPuntos[0].longitud },
      { lat: comparedPuntos[1].latitud, lng: comparedPuntos[1].longitud }
    );
  }, [comparedPuntos]);

  const handleMapClick = useCallback(
    (ev: { detail: { latLng?: { lat: number; lng: number } | null } }) => {
      if (!pickOnMapActive) return;
      const latLng = ev.detail?.latLng;
      if (!latLng) return;
      onPickCoordinates(latLng.lat, latLng.lng);
    },
    [pickOnMapActive, onPickCoordinates]
  );

  if (!apiKey) {
    return (
      <div className="flex h-full min-h-[480px] w-full items-center justify-center border border-slate-200 bg-slate-100 p-8">
        <div className="max-w-md border border-slate-200 bg-white p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-amber-600" />
          <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
            Falta la clave de Google Maps
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Configurá la variable{' '}
            <code className="font-mono text-xs text-slate-900">
              VITE_GOOGLE_MAPS_API_KEY
            </code>{' '}
            en las variables de entorno para renderizar el mapa interactivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden border border-slate-200 bg-slate-100">
      <APIProvider apiKey={apiKey} libraries={['marker']} language="es" region="PY">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          mapTypeControl={true}
          streetViewControl={false}
          fullscreenControl={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          <CameraController
            puntos={puntos}
            selectedId={selectedId}
            compareIds={compareIds}
          />
          {puntos.map((punto) => (
            <MarkerItem
              key={punto.id}
              punto={punto}
              isSelected={punto.id === selectedId}
              isCompared={compareIds.includes(punto.id)}
              onSelect={(id) => onSelectPunto(id)}
              onCloseInfo={() => onSelectPunto(null)}
            />
          ))}
        </GoogleMap>
        <MapStatusOverlay />
      </APIProvider>

      {/* Map legend & active coordinate HUD */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-4 border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-xs backdrop-blur-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Trees className="h-3.5 w-3.5 text-emerald-700" />
            <span>Naturaleza (N)</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">
            |
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Volume2 className="h-3.5 w-3.5 text-amber-700" />
            <span>Actividad humana (H)</span>
          </span>
        </div>

        {pickOnMapActive && (
          <div className="pointer-events-auto flex items-center gap-1.5 border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900 shadow-xs">
            <Crosshair className="h-3.5 w-3.5 text-blue-700" />
            <span>Hacé clic en el mapa para cargar latitud y longitud</span>
          </div>
        )}
      </div>

      {/* Selected point coordinate readout */}
      {selectedPunto && comparedPuntos.length < 2 && (
        <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-10 max-w-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                Punto seleccionado
              </p>
              <p className="truncate font-display text-sm font-semibold text-slate-950">
                {selectedPunto.nombre_punto}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {selectedPunto.sonido_observado} ·{' '}
                <span className="font-mono tabular-nums">
                  {selectedPunto.hora_observacion}
                </span>{' '}
                · {selectedPunto.origen_sonido}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-slate-500">
                Coordenadas GPS
              </p>
              <p className="font-mono text-xs font-semibold tabular-nums text-slate-900">
                {selectedPunto.latitud.toFixed(6)},{' '}
                {selectedPunto.longitud.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-side comparison bar for 2 selected points */}
      {comparedPuntos.length === 2 && comparisonDistance !== null && (
        <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-10 border border-slate-300 bg-white/95 p-3.5 shadow-sm backdrop-blur-xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div>
              <span className="font-display text-xs font-semibold text-slate-900">
                Comparación de 2 ubicaciones
              </span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-mono text-xs font-medium tabular-nums text-blue-700">
                Distancia en línea recta:{' '}
                {comparisonDistance >= 1000
                  ? `${(comparisonDistance / 1000).toFixed(2)} km`
                  : `${Math.round(comparisonDistance)} m`}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearCompare}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950 whitespace-nowrap shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Cerrar comparación
            </button>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {comparedPuntos.map((punto, idx) => (
              <button
                key={punto.id}
                type="button"
                onClick={() => onSelectPunto(punto.id)}
                className="text-left border border-slate-200 bg-slate-50/70 px-3 py-2 hover:bg-slate-100 transition-colors"
              >
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {idx === 0 ? 'A. ' : 'B. '}
                  {punto.nombre_punto}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 truncate">
                  {punto.sonido_observado} · {punto.origen_sonido}
                </p>
                <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
                  {punto.latitud.toFixed(6)}, {punto.longitud.toFixed(6)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
