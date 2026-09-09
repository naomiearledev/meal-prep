import Link from "next/link";
import type { CartLine } from "@/db/cart";

type Props = {
  lines: CartLine[];
  updateAction: (recipeId: number, formData: FormData) => Promise<void>;
  removeAction: (recipeId: number) => Promise<void>;
  createOrderAction: () => Promise<void>;
  error?: string;
};

export function CartView({ lines, updateAction, removeAction, createOrderAction, error }: Props) {
  const total = lines.reduce((sum, line) => sum + line.portions, 0);

  if (lines.length === 0) {
    return (
      <p className="text-neutral-600">
        Your cart is empty. Pick something from the{" "}
        <Link href="/" className="underline">
          recipes
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-neutral-200">
        {lines.map((line) => (
          <li key={line.id} aria-label={line.recipe.name} className="flex flex-wrap items-center gap-4 py-3">
            <Link href={`/recipes/${line.recipe.id}`} className="flex-1 font-medium underline">
              {line.recipe.name}
            </Link>
            <form action={updateAction.bind(null, line.recipeId)} className="flex items-center gap-2">
              <input
                type="number"
                name="portions"
                aria-label="Portions"
                defaultValue={line.portions}
                min={0}
                step={1}
                inputMode="numeric"
                className="w-20 rounded border border-neutral-300 px-3 py-2"
              />
              <span className="text-sm text-neutral-600">portions</span>
              <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm">
                Update
              </button>
            </form>
            <form action={removeAction.bind(null, line.recipeId)}>
              <button type="submit" className="text-sm text-neutral-600 underline hover:text-red-700">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-4">
        <p className="text-neutral-700">
          {total} portion{total === 1 ? "" : "s"} in total
        </p>
        <form action={createOrderAction}>
          <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-medium text-white">
            Create order
          </button>
        </form>
      </div>
    </div>
  );
}
