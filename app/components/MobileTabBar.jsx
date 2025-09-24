"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

type Tab = {
  href: string;
  label: string;
  icon: string; // simple emoji icons for now
  external?: boolean;
};

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/my-team", label: "My Team", icon: "👥" },
  { href: "/calendar", label: "Calendar", icon: "🗓️" },
  {
    href: "https://www.atptour.com/en/scores/current",
    label: "Scores",
    icon: "📊",
    external: true,
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((tab) => {
        const active = !tab.external && isActive(tab.href);
        const className = `tabbar-link${active ? " is-active" : ""}`;

        return (
          <Fragment key={tab.href}>
            {tab.external ? (
              <a
                href={tab.href}
                target="_blank"
                rel="noopener noreferrer"
                className="tabbar-link"
              >
                <span className="tabbar-icon" aria-hidden>{tab.icon}</span>
                <span className="tabbar-label">{tab.label}</span>
              </a>
            ) : (
              <Link href={tab.href} className={className}>
                <span className="tabbar-icon" aria-hidden>{tab.icon}</span>
                <span className="tabbar-label">{tab.label}</span>
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
