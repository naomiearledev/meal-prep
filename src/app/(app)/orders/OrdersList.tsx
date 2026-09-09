import type { OrderSummary } from "@/db/orders";
import { formatOrderDate } from "@/lib/dates";

type Props = {
  orders: OrderSummary[];
  toggleFulfilledAction: (id: number, fulfilled: boolean) => Promise<void>;
};

const SELECTION_FORM = "select-orders";

/**
 * Orders with a tick box each. The tick boxes belong to a separate GET form (via the
 * `form` attribute) so they can sit beside each order's own fulfilled-toggle form.
 */
export function OrdersList({ orders, toggleFulfilledAction }: Props) {
  if (orders.length === 0) {
    return <p className="text-neutral-600">No outstanding orders.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        id={SELECTION_FORM}
        method="get"
        action="/orders/shopping-list"
        className="flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 p-3 text-sm"
      >
        <span className="text-neutral-700">Tick orders, then:</span>
        <button type="submit" className="rounded bg-neutral-900 px-3 py-2 font-medium text-white">
          Shopping list
        </button>
        <button
          type="submit"
          formAction="/orders/prep-sheet"
          className="rounded bg-neutral-900 px-3 py-2 font-medium text-white"
        >
          Prep sheet
        </button>
      </form>

      <ul className="flex flex-col gap-4">
        {orders.map((order) => {
          const fulfilled = order.fulfilledAt !== null;
          const dateLabel = formatOrderDate(order.createdAt);
          return (
            <li
              key={order.id}
              aria-label={`Order ${dateLabel}`}
              className={`rounded-lg border border-neutral-200 p-4 ${fulfilled ? "bg-neutral-50 text-neutral-600" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="ids"
                    value={order.id}
                    form={SELECTION_FORM}
                    aria-label={`Select order ${dateLabel}`}
                    className="mt-1.5 size-4"
                  />
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold">{dateLabel}</h2>
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
    </div>
  );
}
