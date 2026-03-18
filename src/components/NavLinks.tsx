"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/evaluations", label: "自己評価" },
  { href: "/members", label: "社員一覧" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm">
      {links.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "font-semibold text-gray-900 border-b-2 border-gray-900 pb-0.5"
                : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent pb-0.5"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
