"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/reports", label: "Reports" },
  { href: "/portfolio", label: "포트폴리오" },
  { href: "/assets", label: "가계자산" },
  { href: "/coaching", label: "AI 코칭" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center gap-4 sm:gap-8">
        <Link href="/" className="shrink-0 whitespace-nowrap font-bold text-slate-900 tracking-tight">
          Family Asset <span className="text-blue-600">Manager</span>
        </Link>
        <nav className="flex gap-4 sm:gap-6 text-sm font-medium overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "shrink-0 " +
                  (active
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-slate-900 transition-colors")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
