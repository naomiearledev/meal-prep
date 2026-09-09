import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getIngredient, listIngredients } from "@/db/ingredients";
import { ConfirmButton } from "@/components/ConfirmButton";
import { IngredientForm } from "../../IngredientForm";
import { deleteIngredientAction, updateIngredientAction } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditIngredientPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const db = getDb();
  const ingredient = getIngredient(db, Number(id));
  if (!ingredient) notFound();

  const library = listIngredients(db);
  const update = updateIngredientAction.bind(null, ingredient.id);
  const remove = deleteIngredientAction.bind(null, ingredient.id);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Edit {ingredient.name}</h1>
      <IngredientForm action={update} library={library} initial={ingredient} />
      <form action={remove} className="border-t border-neutral-200 pt-6">
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <ConfirmButton
          message={`Delete ${ingredient.name}? This can't be undone.`}
          className="rounded border border-red-700 px-4 py-2 text-sm font-medium text-red-700"
        >
          Delete ingredient
        </ConfirmButton>
      </form>
    </main>
  );
}
