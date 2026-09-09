"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { listIngredients } from "@/db/ingredients";
import { RecipeError, createRecipe, deleteRecipe, updateRecipe, validateRecipeInput } from "@/db/recipes";
import type { RecipeFormState } from "./RecipeForm";

function ingredientsById() {
  return new Map(listIngredients(getDb()).map((ingredient) => [ingredient.id, ingredient]));
}

export async function createRecipeAction(_state: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  const result = validateRecipeInput(formData, ingredientsById());
  if (!result.ok) return { errors: result.errors };

  const recipe = createRecipe(getDb(), result.value);
  revalidatePath("/");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipeAction(
  id: number,
  _state: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const result = validateRecipeInput(formData, ingredientsById());
  if (!result.ok) return { errors: result.errors };

  try {
    updateRecipe(getDb(), id, result.value);
  } catch (error) {
    if (error instanceof RecipeError) return { errors: { form: error.message } };
    throw error;
  }
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipeAction(id: number): Promise<void> {
  try {
    deleteRecipe(getDb(), id);
  } catch (error) {
    if (error instanceof RecipeError) {
      redirect(`/recipes/${id}/edit?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/");
  redirect("/");
}
