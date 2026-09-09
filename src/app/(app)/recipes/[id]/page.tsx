import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getRecipe } from "@/db/recipes";

type Props = { params: Promise<{ id: string }> };

export default async function RecipePage({ params }: Props) {
  const { id } = await params;
  const recipe = getRecipe(getDb(), Number(id));
  if (!recipe) notFound();

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold">{recipe.name}</h1>
        <Link href={`/recipes/${recipe.id}/edit`} className="rounded border border-neutral-300 px-4 py-2 text-sm">
          Edit
        </Link>
      </div>

      {recipe.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photoUrl} alt={recipe.name} className="max-h-96 w-full max-w-xl rounded-lg object-cover" />
      )}

      {recipe.notes && <p className="whitespace-pre-line text-neutral-700">{recipe.notes}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Ingredients <span className="text-sm font-normal text-neutral-600">per portion</span>
        </h2>
        <ul className="flex flex-col gap-1">
          {recipe.ingredients.map((row) => (
            <li key={row.id}>
              <span className="tabular-nums">
                {row.amount} {row.unit}
              </span>{" "}
              {row.ingredient.name}
            </li>
          ))}
        </ul>
      </section>

      {recipe.steps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Method</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-6">
            {recipe.steps.map((step) => (
              <li key={step.id} className="whitespace-pre-line">
                {step.text}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
