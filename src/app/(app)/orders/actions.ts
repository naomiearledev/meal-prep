"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { OrderError, setOrderFulfilled } from "@/db/orders";

export async function toggleFulfilledAction(id: number, fulfilled: boolean): Promise<void> {
  try {
    setOrderFulfilled(getDb(), id, fulfilled);
  } catch (error) {
    if (!(error instanceof OrderError)) throw error;
    // The order has gone; re-rendering the list is the right outcome anyway.
  }
  revalidatePath("/orders");
}
