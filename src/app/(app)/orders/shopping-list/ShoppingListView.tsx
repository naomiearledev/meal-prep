import Link from "next/link";
import type { ShoppingLine } from "@/lib/aggregate";
import { shoppingListText } from "@/lib/aggregate";
import { CopyButton } from "@/components/CopyButton";

type Props = { orderDates: string[]; lines: ShoppingLine[] };

export function ShoppingListView({ orderDates, lines }: Props) {
  if (orderDates.length === 0) {
    return (
      <p className="text-neutral-600">
        No orders selected. Go back to{" "}
        <Link href="/orders" className="underline">
          orders
        </Link>{" "}
        and tick the ones you&apos;re shopping for.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-neutral-700">
        For {orderDates.length === 1 ? "the order on" : "orders on"} {orderDates.join(", ")}.
      </p>
      <CopyButton text={shoppingListText(lines)} label="Copy for Reminders" />
      <ul className="flex max-w-md flex-col divide-y divide-neutral-200">
        {lines.map((line) => (
          <li key={line.ingredientId} className="flex justify-between gap-4 py-2">
            <span>{line.name}</span>
            <span className="tabular-nums text-neutral-700"> {line.display}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-neutral-600">
        Paste into Apple Reminders and each line becomes an item.
      </p>
    </div>
  );
}
