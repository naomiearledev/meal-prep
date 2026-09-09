import Link from "next/link";
import { getDb } from "@/db";
import { getOrdersByIds, shoppingSourcesForOrders } from "@/db/orders";
import { aggregateShoppingList } from "@/lib/aggregate";
import { formatOrderDate } from "@/lib/dates";
import { parseIds } from "@/lib/ids";
import { ConversionError } from "@/lib/units";
import { ShoppingListView } from "./ShoppingListView";

type Props = { searchParams: Promise<{ ids?: string | string[] }> };

export default async function ShoppingListPage({ searchParams }: Props) {
  const { ids } = await searchParams;
  const db = getDb();
  const selected = getOrdersByIds(db, parseIds(ids));
  const orderDates = selected.map((order) => formatOrderDate(order.createdAt));

  let content: React.ReactNode;
  try {
    const lines = aggregateShoppingList(shoppingSourcesForOrders(db, selected.map((order) => order.id)));
    content = <ShoppingListView orderDates={orderDates} lines={lines} />;
  } catch (error) {
    if (!(error instanceof ConversionError)) throw error;
    content = (
      <p role="alert" className="text-red-700">
        {error.message}. Fix it in the{" "}
        <Link href="/ingredients" className="underline">
          ingredient library
        </Link>
        .
      </p>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Shopping list</h1>
        <Link href="/orders" className="text-sm underline">
          Back to orders
        </Link>
      </div>
      {content}
    </main>
  );
}
