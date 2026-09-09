import { getDb } from "@/db";
import { listIngredients } from "@/db/ingredients";
import { RecipeForm } from "../RecipeForm";
import { createRecipeAction } from "../actions";

export default function NewRecipePage() {
  const library = listIngredients(getDb());
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Add recipe</h1>
      <RecipeForm action={createRecipeAction} library={library} />
    </main>
  );
}
