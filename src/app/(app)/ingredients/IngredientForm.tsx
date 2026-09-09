"use client";

import { useActionState, useState } from "react";
import type { MeasureType } from "@/db/schema";

export type LibraryEntry = {
  id: number;
  name: string;
  measureType: MeasureType;
  gramsPerMl: number | null;
  countUnit: string | null;
  gramsEach: number | null;
};

export type IngredientFormState = { errors?: Record<string, string> };

type Props = {
  action: (state: IngredientFormState, formData: FormData) => Promise<IngredientFormState>;
  library: LibraryEntry[];
  initial?: LibraryEntry;
};

const inputClass = "rounded border border-neutral-300 px-3 py-2";

export function IngredientForm({ action, library, initial }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(initial?.name ?? "");
  const [measureType, setMeasureType] = useState<MeasureType>(initial?.measureType ?? "weight");
  const [gramsPerMl, setGramsPerMl] = useState(initial?.gramsPerMl?.toString() ?? "");
  const [countUnit, setCountUnit] = useState(initial?.countUnit ?? "");
  const [gramsEach, setGramsEach] = useState(initial?.gramsEach?.toString() ?? "");
  const errors = state.errors ?? {};

  const copyFrom = (id: string) => {
    const source = library.find((entry) => entry.id === Number(id));
    if (!source) return;
    setMeasureType(source.measureType);
    setGramsPerMl(source.gramsPerMl?.toString() ?? "");
    setCountUnit(source.countUnit ?? "");
    setGramsEach(source.gramsEach?.toString() ?? "");
  };

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <Field id="ingredient-name" label="Name" error={errors.name}>
        <input
          id="ingredient-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </Field>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Same as… (copies the type and density)</span>
        <select defaultValue="" onChange={(e) => copyFrom(e.target.value)} className={inputClass}>
          <option value="">Choose an existing ingredient</option>
          {library
            .filter((entry) => entry.id !== initial?.id)
            .map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Measured by</legend>
        <div className="flex gap-4">
          {(["weight", "volume", "count"] as const).map((type) => (
            <label key={type} className="flex items-center gap-1">
              <input
                type="radio"
                name="measureType"
                value={type}
                checked={measureType === type}
                onChange={() => setMeasureType(type)}
              />
              {type[0].toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-600">
          Weight shows in grams on the shopping list, volume in millilitres, count as whole items.
        </p>
        {errors.measureType && <FieldError>{errors.measureType}</FieldError>}
      </fieldset>

      <Field
        id="ingredient-grams-per-ml"
        label="Grams per ml (density)"
        hint="Lets tsp, tbsp and cups convert. Olive oil 0.92, salt 1.2, plain flour 0.53."
        error={errors.gramsPerMl}
      >
        <input
          id="ingredient-grams-per-ml"
          name="gramsPerMl"
          type="number"
          step="any"
          min="0"
          value={gramsPerMl}
          onChange={(e) => setGramsPerMl(e.target.value)}
          className={inputClass}
        />
      </Field>

      {measureType === "count" && (
        <>
          <Field
            id="ingredient-count-unit"
            label="Count unit"
            hint="What one is called: egg, clove, tin."
            error={errors.countUnit}
          >
            <input
              id="ingredient-count-unit"
              name="countUnit"
              value={countUnit}
              onChange={(e) => setCountUnit(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            id="ingredient-grams-each"
            label="Grams each (optional)"
            hint="Lets a recipe weigh it instead."
            error={errors.gramsEach}
          >
            <input
              id="ingredient-grams-each"
              name="gramsEach"
              type="number"
              step="any"
              min="0"
              value={gramsEach}
              onChange={(e) => setGramsEach(e.target.value)}
              className={inputClass}
            />
          </Field>
        </>
      )}

      {errors.form && <FieldError>{errors.form}</FieldError>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {initial ? "Save" : "Add ingredient"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-neutral-600">{hint}</span>}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <span role="alert" className="text-sm text-red-700">
      {children}
    </span>
  );
}
