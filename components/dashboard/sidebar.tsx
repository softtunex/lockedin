"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMsUntilMidnight, formatCountdown } from "@/lib/use-midnight-countdown";
import {
  LayoutDashboard,
  Target,
  CalendarDays,
  Users,
  HeartHandshake,
  Settings,
  LogOut,
  Flame,
  Plus,
  MoreVertical,
} from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/feed", label: "Feed", icon: Users },
  { href: "/buddy", label: "Buddy", icon: HeartHandshake },
  { href: "/settings", label: "Settings", icon: Settings },
];

const TAB_LINKS = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/buddy", label: "Buddy", icon: HeartHandshake },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ streak, buddyBadgeCount = 0 }: { streak: number; buddyBadgeCount?: number }) {
  const pathname = usePathname();
  const msRemaining = useMsUntilMidnight();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 sm:flex">
        <div className="mb-8 px-2">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-foreground">
            LockedIn
          </Link>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Lock In Your Goals
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {href === "/buddy" && buddyBadgeCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
                    {buddyBadgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-1.5 px-3 text-sm font-semibold text-orange-500">
            <Flame className={cn("h-4 w-4", streak > 0 && "animate-pulse")} />
            {streak} Day Streak
          </div>
          <Button render={<Link href="/goals/new" />} nativeButton={false} className="w-full">
            <Plus className="h-4 w-4" /> Add New Goal
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur sm:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-bold tracking-tight">
              LockedIn
            </Link>
            <div className="flex items-center gap-1 text-sm font-semibold text-orange-500">
              <Flame className={cn("h-4 w-4", streak > 0 && "animate-pulse")} />
              {streak}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {msRemaining !== null && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-destructive">
                {formatCountdown(msRemaining)}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/feed" />}>
                  <Users className="h-4 w-4" /> Feed
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-border bg-background/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TAB_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground",
                active && "text-primary",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {href === "/buddy" && buddyBadgeCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                    {buddyBadgeCount > 9 ? "9+" : buddyBadgeCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
