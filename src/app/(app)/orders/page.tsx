import Link from "next/link";
import { getDb } from "@/db";
import { listOrders } from "@/db/orders";
import { OrdersList } from "./OrdersList";
import { toggleFulfilledAction } from "./actions";

type Props = { searchParams: Promise<{ show?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const { show } = await searchParams;
  const includeFulfilled = show === "all";
  const orders = listOrders(getDb(), { includeFulfilled });

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-neutral-900 text-white" : "border border-neutral-300"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Orders</h1>
        <div className="flex gap-2">
          {tab("/orders", "Outstanding", !includeFulfilled)}
          {tab("/orders?show=all", "All", includeFulfilled)}
        </div>
      </div>
      <OrdersList orders={orders} toggleFulfilledAction={toggleFulfilledAction} />
    </main>
  );
}
