import Link from "next/link";
import { getDb } from "@/db";
import { listIngredients } from "@/db/ingredients";

type Props = { searchParams: Promise<{ q?: string }> };

const typeLabel = { weight: "Weight", volume: "Volume", count: "Count" } as const;

export default async function IngredientsPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const ingredients = listIngredients(getDb(), q);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Ingredients</h1>
        <Link
          href="/ingredients/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add ingredient
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search"
          aria-label="Search ingredients"
          className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
        />
        <button type="submit" className="rounded border border-neutral-300 px-4 py-2 text-sm">
          Search
        </button>
      </form>

      {ingredients.length === 0 ? (
        <p className="text-neutral-600">
          {q ? `Nothing matches “${q}”.` : "No ingredients yet. Run `npm run db:seed` to load the starter library."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-600">
              <tr>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Measured by</th>
                <th className="py-2 pr-4 font-medium">g per ml</th>
                <th className="py-2 pr-4 font-medium">Count unit</th>
                <th className="py-2 pr-4 font-medium">g each</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ingredient) => (
                <tr key={ingredient.id} className="border-t border-neutral-200">
                  <td className="py-2 pr-4 font-medium">{ingredient.name}</td>
                  <td className="py-2 pr-4">{typeLabel[ingredient.measureType]}</td>
                  <td className="py-2 pr-4">{ingredient.gramsPerMl ?? "—"}</td>
                  <td className="py-2 pr-4">{ingredient.countUnit ?? "—"}</td>
                  <td className="py-2 pr-4">{ingredient.gramsEach ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">
                    <Link href={`/ingredients/${ingredient.id}/edit`} className="underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-neutral-600">
        {ingredients.length} ingredient{ingredients.length === 1 ? "" : "s"}
      </p>
    </main>
  );
}
