"use client";

import { useActionState, useState } from "react";
import type { Ingredient } from "@/db/ingredients";
import type { RecipeDetail } from "@/db/recipes";
import { allowedUnits } from "@/lib/units";
import { PhotoField } from "./PhotoField";

export type RecipeFormState = { errors?: Record<string, string> };

type Props = {
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  library: Ingredient[];
  initial?: RecipeDetail;
};

type Row = { key: number; ingredientId: string; amount: string; unit: string };
type Step = { key: number; text: string };

const inputClass = "rounded border border-neutral-300 px-3 py-2";
let nextKey = 1;
const newRow = (): Row => ({ key: nextKey++, ingredientId: "", amount: "", unit: "" });
const newStep = (): Step => ({ key: nextKey++, text: "" });

export function RecipeForm({ action, library, initial }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};
  const byId = new Map(library.map((ingredient) => [String(ingredient.id), ingredient]));

  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    initial && initial.ingredients.length > 0
      ? initial.ingredients.map((row) => ({
          key: nextKey++,
          ingredientId: String(row.ingredientId),
          amount: String(row.amount),
          unit: row.unit,
        }))
      : [newRow()],
  );
  const [steps, setSteps] = useState<Step[]>(() =>
    initial && initial.steps.length > 0
      ? initial.steps.map((step) => ({ key: nextKey++, text: step.text }))
      : [newStep()],
  );

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const chooseIngredient = (key: number, ingredientId: string) => {
    const ingredient = byId.get(ingredientId);
    const units = ingredient ? allowedUnits(ingredient) : [];
    updateRow(key, { ingredientId, unit: units[0] ?? "" });
  };

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="recipe-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="recipe-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </div>

      <PhotoField initialUrl={initial?.photoUrl ?? null} />

      <div className="flex flex-col gap-1">
        <label htmlFor="recipe-notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="recipe-notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Ingredients</h2>
        <p className="text-sm text-neutral-600">
          Amounts are <strong>per portion</strong>. An order for 6 portions multiplies everything by 6.
        </p>
        {errors.ingredients && <FieldError>{errors.ingredients}</FieldError>}
        {rows.map((row, index) => {
          const ingredient = byId.get(row.ingredientId);
          const units = ingredient ? allowedUnits(ingredient) : [];
          const error = errors[`ingredient.${index}`];
          return (
            <fieldset key={row.key} aria-label={`Ingredient row ${index + 1}`} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="ingredientId"
                  aria-label="Ingredient"
                  value={row.ingredientId}
                  onChange={(e) => chooseIngredient(row.key, e.target.value)}
                  className={`${inputClass} min-w-48 flex-1`}
                >
                  <option value="">Select ingredient…</option>
                  {library.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <input
                  name="amount"
                  aria-label="Amount"
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                  className={`${inputClass} w-24`}
                />
                <select
                  name="unit"
                  aria-label="Unit"
                  value={row.unit}
                  onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                  disabled={units.length === 0}
                  className={`${inputClass} w-24`}
                >
                  {units.length === 0 && <option value="">–</option>}
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Remove ingredient"
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  className="px-2 text-neutral-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              {error && <FieldError>{error}</FieldError>}
            </fieldset>
          );
        })}
        <button
          type="button"
          onClick={() => setRows((current) => [...current, newRow()])}
          className="self-start rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          Add another ingredient
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Steps</h2>
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-start gap-2">
            <label htmlFor={`recipe-step-${step.key}`} className="w-6 pt-2 text-sm text-neutral-600">
              {index + 1}.
              <span className="sr-only"> </span>
            </label>
            <textarea
              id={`recipe-step-${step.key}`}
              name="step"
              aria-label={`Step ${index + 1}`}
              value={step.text}
              onChange={(e) =>
                setSteps((current) => current.map((s) => (s.key === step.key ? { ...s, text: e.target.value } : s)))
              }
              rows={2}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              aria-label="Remove step"
              onClick={() => setSteps((current) => current.filter((s) => s.key !== step.key))}
              className="px-2 pt-2 text-neutral-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSteps((current) => [...current, newStep()])}
          className="self-start rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          Add another step
        </button>
      </section>

      {errors.form && <FieldError>{errors.form}</FieldError>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {initial ? "Save" : "Add recipe"}
      </button>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <span role="alert" className="text-sm text-red-700">
      {children}
    </span>
  );
}
