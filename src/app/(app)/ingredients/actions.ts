"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  IngredientError,
  createIngredient,
  deleteIngredient,
  updateIngredient,
  validateIngredientInput,
} from "@/db/ingredients";
import type { IngredientFormState } from "./IngredientForm";

export async function createIngredientAction(
  _state: IngredientFormState,
  formData: FormData,
): Promise<IngredientFormState> {
  const result = validateIngredientInput(formData);
  if (!result.ok) return { errors: result.errors };

  try {
    createIngredient(getDb(), result.value);
  } catch (error) {
    if (error instanceof IngredientError) return { errors: { name: error.message } };
    throw error;
  }

  revalidatePath("/ingredients");
  redirect("/ingredients");
}

export async function updateIngredientAction(
  id: number,
  _state: IngredientFormState,
  formData: FormData,
): Promise<IngredientFormState> {
  const result = validateIngredientInput(formData);
  if (!result.ok) return { errors: result.errors };

  try {
    updateIngredient(getDb(), id, result.value);
  } catch (error) {
    if (error instanceof IngredientError) return { errors: { name: error.message } };
    throw error;
  }

  revalidatePath("/ingredients");
  redirect("/ingredients");
}

export async function deleteIngredientAction(id: number): Promise<void> {
  try {
    deleteIngredient(getDb(), id);
  } catch (error) {
    if (error instanceof IngredientError) {
      redirect(`/ingredients/${id}/edit?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/ingredients");
  redirect("/ingredients");
}
