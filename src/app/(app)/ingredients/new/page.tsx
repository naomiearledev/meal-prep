import { getDb } from "@/db";
import { listIngredients } from "@/db/ingredients";
import { IngredientForm } from "../IngredientForm";
import { createIngredientAction } from "../actions";

export default function NewIngredientPage() {
  const library = listIngredients(getDb());
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Add ingredient</h1>
      <IngredientForm action={createIngredientAction} library={library} />
    </main>
  );
}
