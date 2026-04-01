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
import { branding, features } from "@/config/user";

const nav = [
  { href: "/home",     label: "Home",          icon: Home,   enabled: true           },
  { href: "/training", label: "Training",      icon: Zap,    enabled: true           },
  { href: "/marathon", label: "Marathon",      icon: Medal,  enabled: true           },
  { href: "/sleep",    label: "Sleep & Health",icon: Waves,  enabled: true           },
  { href: "/diet",     label: "Diet",          icon: Leaf,   enabled: features.diet  },
  { href: "/goals",    label: "Goals",         icon: Sprout, enabled: true           },
].filter((item) => item.enabled);

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

      {/* Beach illustration — subtle surf & wave decoration */}
      <div className="px-3 pb-1 pointer-events-none select-none" aria-hidden="true">
        <svg
          viewBox="0 0 192 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full text-primary opacity-[0.11]"
        >
          {/* Surfboard body */}
          <path
            d="M148 6 Q152 2 156 6 L158 34 Q156 41 152 42 Q148 41 146 34 Z"
            fill="currentColor"
          />
          {/* Surfboard fin */}
          <path d="M152 40 L149 48 L152 46 L155 48 Z" fill="currentColor" />
          {/* Surfboard center stripe */}
          <line x1="152" y1="8" x2="152" y2="39" stroke="hsl(38 35% 97%)" strokeWidth="1.2" strokeLinecap="round" />
          {/* Surfboard nose detail */}
          <circle cx="152" cy="7" r="1.5" fill="hsl(38 35% 97%)" opacity="0.6" />

          {/* Ocean waves */}
          <path
            d="M0 36 Q12 30 24 36 Q36 42 48 36 Q60 30 72 36 Q84 42 96 36 Q108 30 120 36 Q132 42 144 36 Q156 30 168 36 Q180 42 192 36"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M0 43 Q12 37 24 43 Q36 49 48 43 Q60 37 72 43 Q84 49 96 43 Q108 37 120 43 Q132 49 144 43 Q156 37 168 43 Q180 49 192 43"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M0 49 Q16 44 32 49 Q48 54 64 49 Q80 44 96 49 Q112 54 128 49 Q144 44 160 49 Q176 54 192 49"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.3"
          />
        </svg>
      </div>

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
