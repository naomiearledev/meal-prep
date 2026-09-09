"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { CartError, addToCart, removeFromCart, setCartPortions } from "@/db/cart";
import { OrderError, createOrderFromCart } from "@/db/orders";

function portionsFrom(formData: FormData): number {
  return Number(String(formData.get("portions") ?? "").trim());
}

function backToCart(error?: string): never {
  revalidatePath("/cart");
  redirect(error ? `/cart?error=${encodeURIComponent(error)}` : "/cart");
}

export async function addToCartAction(recipeId: number, formData: FormData): Promise<void> {
  let error: string | undefined;
  try {
    addToCart(getDb(), recipeId, portionsFrom(formData));
  } catch (caught) {
    if (!(caught instanceof CartError)) throw caught;
    error = caught.message;
  }
  backToCart(error);
}

export async function updateCartAction(recipeId: number, formData: FormData): Promise<void> {
  let error: string | undefined;
  try {
    setCartPortions(getDb(), recipeId, portionsFrom(formData));
  } catch (caught) {
    if (!(caught instanceof CartError)) throw caught;
    error = caught.message;
  }
  backToCart(error);
}

export async function removeCartAction(recipeId: number): Promise<void> {
  removeFromCart(getDb(), recipeId);
  backToCart();
}

export async function createOrderAction(): Promise<void> {
  try {
    createOrderFromCart(getDb());
  } catch (caught) {
    if (!(caught instanceof OrderError)) throw caught;
    backToCart(caught.message);
  }
  revalidatePath("/cart");
  revalidatePath("/orders");
  redirect("/orders");
}
