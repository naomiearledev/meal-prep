import Link from "next/link";
import { getDb } from "@/db";
import { listRecipes } from "@/db/recipes";
import { RecipeGrid } from "./RecipeGrid";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function RecipesPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const recipes = listRecipes(getDb(), q);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Recipes</h1>
        <Link href="/recipes/new" className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          Add recipe
        </Link>
      </div>
      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search recipes"
          aria-label="Search recipes"
          className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
        />
        <button type="submit" className="rounded border border-neutral-300 px-4 py-2 text-sm">
          Search
        </button>
      </form>
      {recipes.length === 0 && q ? (
        <p className="text-neutral-600">Nothing matches “{q}”.</p>
      ) : (
        <RecipeGrid recipes={recipes} />
      )}
    </main>
  );
}
