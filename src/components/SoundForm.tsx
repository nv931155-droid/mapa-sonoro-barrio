import type { FormEvent } from 'react';
import { AlertCircle, Crosshair, Save, X } from 'lucide-react';
import type {
  OrigenSonido,
  PuntoSonoroInput,
  ValidationErrors,
} from '../types/sound.ts';

interface SoundFormProps {
  mode: 'create' | 'edit';
  values: PuntoSonoroInput;
  errors: ValidationErrors;
  serverError: string | null;
  isSubmitting: boolean;
  pickOnMapActive: boolean;
  onChange: (next: PuntoSonoroInput) => void;
  onTogglePickOnMap: () => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export function SoundForm({
  mode,
  values,
  errors,
  serverError,
  isSubmitting,
  pickOnMapActive,
  onChange,
  onTogglePickOnMap,
  onSubmit,
  onCancel,
}: SoundFormProps) {
  const updateField = <K extends keyof PuntoSonoroInput>(
    field: K,
    val: PuntoSonoroInput[K]
  ) => {
    onChange({ ...values, [field]: val });
  };

  const hasValidationErrors = Object.keys(errors).length > 0;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950">
            {mode === 'create'
              ? 'Nuevo registro acústico'
              : 'Editar punto sonoro'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Coordenadas en grados decimales (latitud -90 a 90, longitud -180 a
            180).
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cerrar formulario"
          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {(hasValidationErrors || serverError) && (
        <div
          role="alert"
          className="mt-4 border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">
                {serverError ||
                  'No se puede guardar el registro. Revisá los campos marcados:'}
              </p>
              {hasValidationErrors && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-rose-800">
                  {Object.values(errors).map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3.5">
        <div>
          <label
            htmlFor="nombre_punto"
            className="block text-xs font-medium text-slate-700"
          >
            Nombre del punto
          </label>
          <input
            id="nombre_punto"
            type="text"
            value={values.nombre_punto}
            onChange={(e) => updateField('nombre_punto', e.target.value)}
            placeholder="Ej. Portón norte de la Plaza Italia"
            className={`mt-1 w-full border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
              errors.nombre_punto
                ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200'
                : 'border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100'
            }`}
          />
          {errors.nombre_punto && (
            <p className="mt-1 text-xs text-rose-700">{errors.nombre_punto}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="sonido_observado"
            className="block text-xs font-medium text-slate-700"
          >
            Sonido observado
          </label>
          <input
            id="sonido_observado"
            type="text"
            value={values.sonido_observado}
            onChange={(e) => updateField('sonido_observado', e.target.value)}
            placeholder="Ej. Canto de aves entre los lapachos"
            className={`mt-1 w-full border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
              errors.sonido_observado
                ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200'
                : 'border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100'
            }`}
          />
          {errors.sonido_observado && (
            <p className="mt-1 text-xs text-rose-700">
              {errors.sonido_observado}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="hora_observacion"
              className="block text-xs font-medium text-slate-700"
            >
              Hora de observación
            </label>
            <input
              id="hora_observacion"
              type="time"
              value={values.hora_observacion}
              onChange={(e) => updateField('hora_observacion', e.target.value)}
              className={`mt-1 w-full border px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 ${
                errors.hora_observacion
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200'
                  : 'border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100'
              }`}
            />
            {errors.hora_observacion && (
              <p className="mt-1 text-xs text-rose-700">
                {errors.hora_observacion}
              </p>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700">
              Origen del sonido
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1 bg-slate-100 p-1">
              {(['Naturaleza', 'Actividad humana'] as OrigenSonido[]).map(
                (option) => {
                  const active = values.origen_sonido === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('origen_sonido', option)}
                      className={`px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {option === 'Naturaleza' ? 'Naturaleza' : 'Act. humana'}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-700">
              Coordenadas GPS (grados decimales)
            </span>
            <button
              type="button"
              onClick={onTogglePickOnMap}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                pickOnMapActive
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              {pickOnMapActive
                ? 'Clic en mapa activo'
                : 'Elegir punto en mapa'}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="latitud"
                className="block text-[11px] font-medium text-slate-600"
              >
                Latitud (-90 a 90)
              </label>
              <input
                id="latitud"
                type="text"
                inputMode="decimal"
                value={values.latitud}
                onChange={(e) => updateField('latitud', e.target.value)}
                placeholder="-25.286700"
                className={`mt-1 w-full border px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.latitud
                    ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200'
                    : 'border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.latitud && (
                <p className="mt-1 text-xs text-rose-700">{errors.latitud}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="longitud"
                className="block text-[11px] font-medium text-slate-600"
              >
                Longitud (-180 a 180)
              </label>
              <input
                id="longitud"
                type="text"
                inputMode="decimal"
                value={values.longitud}
                onChange={(e) => updateField('longitud', e.target.value)}
                placeholder="-57.647000"
                className={`mt-1 w-full border px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.longitud
                    ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200'
                    : 'border-slate-300 bg-white focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.longitud && (
                <p className="mt-1 text-xs text-rose-700">{errors.longitud}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          <Save className="h-3.5 w-3.5" />
          {isSubmitting
            ? 'Guardando...'
            : mode === 'create'
              ? 'Guardar en Supabase'
              : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
