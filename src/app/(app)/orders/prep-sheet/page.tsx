import Link from "next/link";
import { getDb } from "@/db";
import { getOrdersByIds } from "@/db/orders";
import { getRecipe, type RecipeDetail } from "@/db/recipes";
import { formatOrderDate } from "@/lib/dates";
import { parseIds } from "@/lib/ids";
import { mergePortions } from "@/lib/prep";
import { PrintButton } from "@/components/PrintButton";
import { PrepSheetView } from "./PrepSheetView";

type Props = { searchParams: Promise<{ ids?: string | string[] }> };

export default async function PrepSheetPage({ searchParams }: Props) {
  const { ids } = await searchParams;
  const db = getDb();
  const orders = getOrdersByIds(db, parseIds(ids));
  const merged = mergePortions(orders);

  const recipes = merged.recipes
    .map(({ recipeId, portions }) => ({ recipe: getRecipe(db, recipeId), portions }))
    .filter((entry): entry is { recipe: RecipeDetail; portions: number } => entry.recipe !== undefined);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Prep sheet</h1>
          {orders.length > 0 && (
            <p className="text-neutral-700">
              {orders.length === 1 ? "Order on" : "Orders on"}{" "}
              {orders.map((order) => formatOrderDate(order.createdAt)).join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 print:hidden">
          <Link href="/orders" className="text-sm underline">
            Back to orders
          </Link>
          {recipes.length > 0 && <PrintButton />}
        </div>
      </div>
      <PrepSheetView recipes={recipes} allocation={merged.allocation} />
    </main>
  );
}
