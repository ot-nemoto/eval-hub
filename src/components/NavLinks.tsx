"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const memberLinks = [
  { href: "/evaluations", label: "自己評価" },
  { href: "/members", label: "社員一覧" },
];

const adminLinks = [
  { href: "/admin/users", label: "ユーザー管理" },
  { href: "/admin/evaluation-assignments", label: "アサイン管理" },
  { href: "/admin/targets", label: "マスタ管理" },
  { href: "/admin/evaluation-items", label: "評価項目管理" },
  { href: "/admin/fiscal-years", label: "年度管理" },
];

type Props = { role: "ADMIN" | "MEMBER" };

export function NavLinks({ role }: Props) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? [...memberLinks, ...adminLinks] : memberLinks;

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
