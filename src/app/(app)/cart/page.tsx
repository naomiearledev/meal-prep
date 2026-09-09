import { getDb } from "@/db";
import { getCart } from "@/db/cart";
import { CartView } from "./CartView";
import { createOrderAction, removeCartAction, updateCartAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function CartPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const lines = getCart(getDb());
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Cart</h1>
      <CartView
        lines={lines}
        updateAction={updateCartAction}
        removeAction={removeCartAction}
        createOrderAction={createOrderAction}
        error={error}
      />
    </main>
  );
}
