"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Zap,
  Medal,
  Waves,
  Leaf,
  Sprout,
} from "lucide-react";
import { AcornIcon } from "@/components/acorn-icon";
import { cn } from "@/lib/utils";
import { branding } from "@/config/user";

const nav = [
  { href: "/home",     label: "Home",          icon: Home    },
  { href: "/training", label: "Training",      icon: Zap     },
  { href: "/marathon", label: "Marathon",      icon: Medal   },
  { href: "/sleep",    label: "Sleep & Health",icon: Waves   },
  { href: "/diet",     label: "Diet",          icon: Leaf    },
  { href: "/goals",    label: "Goals",         icon: Sprout  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 shrink-0 rounded-3xl bg-card [box-shadow:var(--shadow-card)] overflow-hidden">
      {/* Brand — click to go home */}
      <Link
        href="/home"
        className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50 group transition-opacity hover:opacity-80"
      >
        <AcornIcon size={18} className="text-primary shrink-0" />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {branding.appName}
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors",
                active
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon
                size={15}
                className={active ? "text-primary" : "text-muted-foreground"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 mb-0.5">
          <AcornIcon size={11} className="text-muted-foreground/50" strokeWidth={2} />
          <p className="text-xs text-muted-foreground">{branding.userName}</p>
        </div>
        <p className="text-xs text-muted-foreground/40 pl-[18px]">
          {new Date().getFullYear()} {branding.appName}
        </p>
      </div>
    </aside>
  );
}
