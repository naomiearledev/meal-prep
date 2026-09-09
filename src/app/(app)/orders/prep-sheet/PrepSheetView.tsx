import Link from "next/link";
import type { RecipeDetail } from "@/db/recipes";
import { formatShortDate } from "@/lib/dates";
import { scaleForPrep, type AllocationRow } from "@/lib/prep";

type Props = {
  recipes: { recipe: RecipeDetail; portions: number }[];
  allocation: AllocationRow[];
};

export function PrepSheetView({ recipes, allocation }: Props) {
  if (recipes.length === 0) {
    return (
      <p className="text-neutral-600">
        No orders selected. Go back to{" "}
        <Link href="/orders" className="underline">
          orders
        </Link>{" "}
        and tick the ones you&apos;re cooking for.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {recipes.map(({ recipe, portions }) => {
        const title = `${recipe.name} — ${portions} portion${portions === 1 ? "" : "s"}`;
        return (
          <section key={recipe.id} aria-label={title} className="flex flex-col gap-4 print:break-after-page">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <ul className="flex flex-col gap-1">
              {recipe.ingredients.map((row) => {
                const scaled = scaleForPrep(row.amount, row.unit, portions, row.ingredient);
                return (
                  <li key={row.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="min-w-24 font-medium tabular-nums">{scaled.display}</span>{" "}
                    <span>{row.ingredient.name}</span>{" "}
                    <span className="text-sm text-neutral-600">
                      ({row.amount} {row.unit} per portion)
                    </span>
                  </li>
                );
              })}
            </ul>
            {recipe.steps.length > 0 && (
              <ol className="flex list-decimal flex-col gap-2 pl-6">
                {recipe.steps.map((step) => (
                  <li key={step.id} className="whitespace-pre-line">
                    {step.text}
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}

      <section aria-label="Allocation" className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Allocation</h2>
        <div className="overflow-x-auto">
          <table aria-label="Allocation" className="text-sm">
            <thead>
              <tr>
                <th scope="col" className="border border-neutral-300 px-3 py-2 text-left font-medium">
                  Order
                </th>
                {recipes.map(({ recipe }) => (
                  <th key={recipe.id} scope="col" className="border border-neutral-300 px-3 py-2 text-left font-medium">
                    {recipe.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocation.map((row) => (
                <tr key={row.orderId}>
                  <td className="border border-neutral-300 px-3 py-2">{formatShortDate(row.date)}</td>
                  {recipes.map(({ recipe }) => (
                    <td key={recipe.id} className="border border-neutral-300 px-3 py-2 text-center tabular-nums">
                      {row.portions[recipe.id] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
