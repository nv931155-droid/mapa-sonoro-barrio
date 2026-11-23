import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  Database,
  GitCompareArrows,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Trees,
  Volume2,
} from 'lucide-react';
import { DeliveryGuide } from './components/DeliveryGuide.tsx';
import { SoundForm } from './components/SoundForm.tsx';
import { SoundMap } from './components/SoundMap.tsx';
import type {
  OrigenSonido,
  PuntoSonoro,
  PuntoSonoroInput,
  ValidationErrors,
} from './types/sound.ts';
import { validatePuntoInput } from './types/sound.ts';

type ActiveView = 'explorer' | 'guide';
type FilterOption = 'Todos' | OrigenSonido;

const EMPTY_FORM: PuntoSonoroInput = {
  nombre_punto: '',
  latitud: '',
  longitud: '',
  sonido_observado: '',
  hora_observacion: '07:30',
  origen_sonido: 'Naturaleza',
};

export default function App() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || ''
  );

  const [activeView, setActiveView] = useState<ActiveView>('explorer');
  const [puntos, setPuntos] = useState<PuntoSonoro[]>([]);
  const [tableName, setTableName] = useState<string>('puntos_sonoros');
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    error: string | null;
  }>({ configured: true, error: null });

  const [filterOrigen, setFilterOrigen] = useState<FilterOption>('Todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<PuntoSonoroInput>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [serverFormError, setServerFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickOnMapActive, setPickOnMapActive] = useState(false);

  // Tier 2 / Top-level Google Maps Quota Exceeded listener
  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Runtime fallback for Maps API key if not injected at Vite build time
  useEffect(() => {
    if (mapsApiKey) return;
    fetch('/api/maps-config')
      .then((res) => res.json())
      .then((data: { apiKey?: string }) => {
        if (data.apiKey) setMapsApiKey(data.apiKey);
      })
      .catch(() => {
        // Ignore config fallback failure
      });
  }, [mapsApiKey]);

  const fetchPuntos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/puntos');
      const data = (await res.json()) as {
        puntos?: PuntoSonoro[];
        table?: string;
        configured?: boolean;
        error?: string;
      };

      if (res.status === 503 || data.configured === false) {
        setSupabaseStatus({
          configured: false,
          error:
            data.error ||
            'Supabase no está configurado todavía en las variables de entorno.',
        });
        setPuntos([]);
        return;
      }

      if (!res.ok) {
        setSupabaseStatus({
          configured: true,
          error: data.error || 'Error al cargar los registros desde Supabase.',
        });
        return;
      }

      const loaded = data.puntos || [];
      setPuntos(loaded);
      if (data.table) setTableName(data.table);
      setSupabaseStatus({ configured: true, error: null });

      setSelectedId((prev) => {
        if (prev && loaded.some((p) => p.id === prev)) return prev;
        return loaded[0]?.id ?? null;
      });
      setCompareIds((prev) =>
        prev.filter((id) => loaded.some((p) => p.id === id))
      );
    } catch {
      setSupabaseStatus({
        configured: true,
        error: 'No se pudo conectar con el servidor de la aplicación.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPuntos();
  }, [fetchPuntos]);

  const counts = useMemo(() => {
    const naturaleza = puntos.filter(
      (p) => p.origen_sonido === 'Naturaleza'
    ).length;
    const humana = puntos.filter(
      (p) => p.origen_sonido === 'Actividad humana'
    ).length;
    return {
      Todos: puntos.length,
      Naturaleza: naturaleza,
      'Actividad humana': humana,
    };
  }, [puntos]);

  const filteredPuntos = useMemo(() => {
    if (filterOrigen === 'Todos') return puntos;
    return puntos.filter((p) => p.origen_sonido === filterOrigen);
  }, [puntos, filterOrigen]);

  const handleFilterChange = (nextFilter: FilterOption) => {
    setFilterOrigen(nextFilter);
    setCompareIds([]);
    if (nextFilter !== 'Todos') {
      const firstMatch = puntos.find((p) => p.origen_sonido === nextFilter);
      setSelectedId(firstMatch ? firstMatch.id : null);
    }
  };

  const openCreateForm = () => {
    setActiveView('explorer');
    setFormMode('create');
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setServerFormError(null);
    setPickOnMapActive(true);
  };

  const openEditForm = (punto: PuntoSonoro) => {
    setActiveView('explorer');
    setFormMode('edit');
    setEditingId(punto.id);
    setSelectedId(punto.id);
    setFormValues({
      nombre_punto: punto.nombre_punto,
      latitud: String(punto.latitud),
      longitud: String(punto.longitud),
      sonido_observado: punto.sonido_observado,
      hora_observacion: punto.hora_observacion,
      origen_sonido: punto.origen_sonido,
    });
    setFormErrors({});
    setServerFormError(null);
    setPickOnMapActive(false);
  };

  const closeForm = () => {
    setFormMode('closed');
    setEditingId(null);
    setFormErrors({});
    setServerFormError(null);
    setPickOnMapActive(false);
  };

  const handlePickCoordinates = useCallback((lat: number, lng: number) => {
    setFormValues((prev) => ({
      ...prev,
      latitud: lat.toFixed(6),
      longitud: lng.toFixed(6),
    }));
    setFormErrors((prev) => ({
      ...prev,
      latitud: undefined,
      longitud: undefined,
    }));
  }, []);

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    setServerFormError(null);

    const validation = validatePuntoInput(formValues);
    if (!validation.valid || !validation.parsed) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const isEdit = formMode === 'edit' && editingId;
      const url = isEdit ? `/api/puntos/${editingId}` : '/api/puntos';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.parsed),
      });

      const data = (await res.json()) as {
        punto?: PuntoSonoro;
        error?: string;
      };

      if (!res.ok || !data.punto) {
        setServerFormError(
          data.error || 'Ocurrió un error al guardar el punto en Supabase.'
        );
        return;
      }

      const saved = data.punto;
      setPuntos((prev) => {
        if (isEdit) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev];
      });
      setSelectedId(saved.id);
      closeForm();
    } catch {
      setServerFormError('Error de red al comunicarse con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/puntos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSupabaseStatus({
          configured: true,
          error: data.error || 'No se pudo eliminar el registro.',
        });
        return;
      }
      setPuntos((prev) => prev.filter((item) => item.id !== id));
      setCompareIds((prev) => prev.filter((cid) => cid !== id));
      if (selectedId === id) setSelectedId(null);
      if (editingId === id) closeForm();
      setConfirmDeleteId(null);
    } catch {
      setSupabaseStatus({
        configured: true,
        error: 'Error de red al eliminar el registro.',
      });
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {quotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Bar Contract: Brand wordmark — Nav links — 1 Primary Action */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-3.5">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('explorer');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          Mapa Sonoro
        </a>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveView('explorer')}
            className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'explorer'
                ? 'border-b-2 border-blue-700 text-slate-950'
                : 'hover:text-slate-950'
            }`}
          >
            Explorador
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('explorer');
              if (compareIds.length === 0 && filteredPuntos.length >= 2) {
                setCompareIds([filteredPuntos[0].id, filteredPuntos[1].id]);
              }
            }}
            className="pb-0.5 transition-colors hover:text-slate-950 whitespace-nowrap shrink-0"
          >
            Comparar puntos
          </button>
          <button
            type="button"
            onClick={() => setActiveView('guide')}
            className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'guide'
                ? 'border-b-2 border-blue-700 text-slate-950'
                : 'hover:text-slate-950'
            }`}
          >
            Guía de entrega
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo punto
          </button>
        </div>
      </header>

      {activeView === 'guide' ? (
        <main className="flex-1">
          <DeliveryGuide />
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-4 py-5 lg:grid lg:grid-cols-[440px_1fr] lg:px-6">
          {/* Left Workspace Column */}
          <section className="flex flex-col gap-4">
            <div className="border border-slate-200 bg-white px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-lg font-semibold text-slate-950">
                    Mapa sonoro del barrio
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Club de Ciencias · Registro acústico georreferenciado
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchPuntos()}
                  title="Recargar registros desde Supabase"
                  aria-label="Recargar registros desde Supabase"
                  className="border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {/* Filter by Sound Origin */}
              <div className="mt-3.5">
                <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                  Filtrar por origen del sonido
                </p>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1">
                  {(
                    ['Todos', 'Naturaleza', 'Actividad humana'] as FilterOption[]
                  ).map((option) => {
                    const active = filterOrigen === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleFilterChange(option)}
                        className={`px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-950'
                        }`}
                      >
                        {option === 'Actividad humana' ? 'Act. humana' : option}{' '}
                        <span className="font-mono text-[11px] tabular-nums text-slate-400">
                          ({counts[option]})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {!supabaseStatus.configured && (
              <div className="border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                <div className="flex items-start gap-2.5">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-semibold">
                      Conectá tu tabla de Supabase para empezar
                    </p>
                    <p className="mt-1 leading-relaxed text-amber-900">
                      Agregá{' '}
                      <code className="font-mono font-semibold">
                        SUPABASE_URL
                      </code>{' '}
                      y{' '}
                      <code className="font-mono font-semibold">
                        SUPABASE_ANON_KEY
                      </code>{' '}
                      en{' '}
                      <strong className="font-semibold">
                        Settings → Secrets
                      </strong>{' '}
                      (o en Render). Tabla esperada:{' '}
                      <code className="font-mono">{tableName}</code>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveView('guide')}
                      className="mt-2 font-semibold text-amber-950 underline hover:text-amber-800"
                    >
                      Ver guía de configuración SQL y variables
                    </button>
                  </div>
                </div>
              </div>
            )}

            {supabaseStatus.configured && supabaseStatus.error && (
              <div
                role="alert"
                className="border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold">Error de conexión</p>
                    <p className="mt-0.5">{supabaseStatus.error}</p>
                  </div>
                </div>
              </div>
            )}

            {formMode !== 'closed' && (
              <SoundForm
                mode={formMode}
                values={formValues}
                errors={formErrors}
                serverError={serverFormError}
                isSubmitting={isSubmitting}
                pickOnMapActive={pickOnMapActive}
                onChange={setFormValues}
                onTogglePickOnMap={() => setPickOnMapActive((v) => !v)}
                onSubmit={handleSubmitForm}
                onCancel={closeForm}
              />
            )}

            {/* Records List */}
            <div className="flex-1 border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                <span className="text-xs font-medium text-slate-700">
                  Puntos registrados
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {filteredPuntos.length} visibles
                </span>
              </div>

              {isLoading ? (
                <div className="divide-y divide-slate-100">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="animate-pulse p-4">
                      <div className="h-4 w-2/3 bg-slate-200" />
                      <div className="mt-2 h-3 w-1/2 bg-slate-100" />
                      <div className="mt-2 h-3 w-3/4 bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : filteredPuntos.length === 0 ? (
                <div className="p-8 text-center">
                  <MapPin className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2.5 font-display text-sm font-semibold text-slate-900">
                    {puntos.length === 0
                      ? 'Todavía no hay puntos registrados'
                      : `No hay registros de "${filterOrigen}"`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {puntos.length === 0
                      ? 'Creá un registro para guardarlo en Supabase y ubicarlo en Google Maps.'
                      : 'Cambiá el filtro o agregá un nuevo punto para esta categoría.'}
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-4 inline-flex items-center gap-1.5 bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Registrar primer punto
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {filteredPuntos.map((punto) => {
                    const isSelected = punto.id === selectedId;
                    const isCompared = compareIds.includes(punto.id);
                    const isNature = punto.origen_sonido === 'Naturaleza';

                    return (
                      <li
                        key={punto.id}
                        className={`p-4 transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(punto.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-sm font-semibold text-slate-950">
                              {punto.nombre_punto}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                                isNature ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {isNature ? (
                                <Trees className="h-3.5 w-3.5" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5" />
                              )}
                              {punto.origen_sonido}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-relaxed text-slate-700">
                            {punto.sonido_observado}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className="font-mono tabular-nums">
                              {punto.hora_observacion}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {punto.latitud.toFixed(6)},{' '}
                              {punto.longitud.toFixed(6)}
                            </span>
                          </div>
                        </button>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                          <button
                            type="button"
                            onClick={() => toggleCompare(punto.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                              isCompared
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <GitCompareArrows className="h-3.5 w-3.5" />
                            {isCompared ? 'En comparación' : 'Comparar'}
                          </button>

                          {confirmDeleteId === punto.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-rose-700">
                                ¿Eliminar?
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleDelete(punto.id)}
                                className="bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 whitespace-nowrap"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditForm(punto)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 whitespace-nowrap"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(punto.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 whitespace-nowrap"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Right Map Stage */}
          <section className="h-[520px] lg:sticky lg:top-[73px] lg:h-[calc(100vh-104px)]">
            <SoundMap
              apiKey={mapsApiKey}
              puntos={filteredPuntos}
              selectedId={selectedId}
              compareIds={compareIds}
              pickOnMapActive={pickOnMapActive && formMode !== 'closed'}
              onSelectPunto={(id) => setSelectedId(id)}
              onPickCoordinates={handlePickCoordinates}
              onClearCompare={() => setCompareIds([])}
            />
          </section>
        </main>
      )}
    </div>
  );
}
