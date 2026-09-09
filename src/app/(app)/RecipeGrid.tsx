import Link from "next/link";

type Card = { id: number; name: string; photoUrl: string | null };

export function RecipeGrid({ recipes }: { recipes: Card[] }) {
  if (recipes.length === 0) {
    return (
      <p className="text-neutral-600">
        No recipes yet.{" "}
        <Link href="/recipes/new" className="underline">
          Add your first recipe
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link href={`/recipes/${recipe.id}`} className="block overflow-hidden rounded-lg border border-neutral-200">
            {recipe.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.photoUrl} alt={recipe.name} className="aspect-square w-full object-cover" />
            ) : (
              <div aria-hidden className="aspect-square w-full bg-neutral-100" />
            )}
            <span className="block p-3 font-medium">{recipe.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
