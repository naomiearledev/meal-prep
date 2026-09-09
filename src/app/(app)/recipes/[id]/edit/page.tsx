import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { listIngredients } from "@/db/ingredients";
import { getRecipe } from "@/db/recipes";
import { ConfirmButton } from "@/components/ConfirmButton";
import { RecipeForm } from "../../RecipeForm";
import { deleteRecipeAction, updateRecipeAction } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditRecipePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const db = getDb();
  const recipe = getRecipe(db, Number(id));
  if (!recipe) notFound();

  const update = updateRecipeAction.bind(null, recipe.id);
  const remove = deleteRecipeAction.bind(null, recipe.id);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Edit {recipe.name}</h1>
      <RecipeForm action={update} library={listIngredients(db)} initial={recipe} />
      <form action={remove} className="border-t border-neutral-200 pt-6">
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <ConfirmButton
          message={`Delete ${recipe.name}? This can't be undone.`}
          className="rounded border border-red-700 px-4 py-2 text-sm font-medium text-red-700"
        >
          Delete recipe
        </ConfirmButton>
      </form>
    </main>
  );
}
