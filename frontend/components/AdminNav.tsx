import Link from "next/link";

const links = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/tournaments", label: "Турниры" },
  { href: "/admin/players", label: "Игроки" },
  { href: "/admin/rating", label: "Рейтинг" },
];

export default function AdminNav() {
  return (
    <nav className="w-full border-b border-black/10 bg-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-display font-bold text-court text-xl">
          graMY <span className="text-shuttle">/ admin</span>
        </Link>
        <div className="flex gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ink/80 hover:text-court font-medium"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
