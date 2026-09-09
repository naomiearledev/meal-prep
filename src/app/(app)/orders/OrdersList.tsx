import type { OrderSummary } from "@/db/orders";
import { formatOrderDate } from "@/lib/dates";

type Props = {
  orders: OrderSummary[];
  toggleFulfilledAction: (id: number, fulfilled: boolean) => Promise<void>;
};

export function OrdersList({ orders, toggleFulfilledAction }: Props) {
  if (orders.length === 0) {
    return <p className="text-neutral-600">No outstanding orders.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {orders.map((order) => {
        const fulfilled = order.fulfilledAt !== null;
        return (
          <li
            key={order.id}
            aria-label={`Order ${formatOrderDate(order.createdAt)}`}
            className={`rounded-lg border border-neutral-200 p-4 ${fulfilled ? "bg-neutral-50 text-neutral-600" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">{formatOrderDate(order.createdAt)}</h2>
                <ul className="flex flex-col text-sm">
                  {order.items.map((item) => (
                    <li key={item.recipeId}>
                      {item.recipeName} × {item.portions}
                    </li>
                  ))}
                </ul>
                <p className="text-sm">
                  {order.totalPortions} portion{order.totalPortions === 1 ? "" : "s"}
                </p>
                {order.fulfilledAt && (
                  <span className="text-sm font-medium text-green-700">
                    Fulfilled {formatOrderDate(order.fulfilledAt)}
                  </span>
                )}
              </div>
              <form action={toggleFulfilledAction.bind(null, order.id, !fulfilled)}>
                <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm">
                  {fulfilled ? "Mark outstanding" : "Mark fulfilled"}
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
