import Link from "next/link";

const links = [
  { href: "/", label: "Recipes" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-neutral-200 print:hidden">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="font-semibold">
            Meal Prep
          </Link>
          <ul className="flex gap-4 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </>
  );
}
