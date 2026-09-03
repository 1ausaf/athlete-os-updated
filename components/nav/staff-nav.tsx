"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import {
  CalendarRange,
  ClipboardList,
  CreditCard,
  Database,
  LineChart,
  ListTodo,
  MessagesSquare,
  Radar,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

import { athletes, threads } from "@/lib/demo/data";
import { dueSoonCount, TASKS_EVENT } from "@/lib/demo/tasks";
import { canManageMemberships, canViewBilling, isAdmin } from "@/lib/rbac";
import type { AppUser } from "@/types/user";

import { ShellNav, type ShellNavItem } from "./shell-nav";

export function StaffNav({
  user,
  liveRoster = false,
}: {
  user: AppUser;
  /** Round 20: the real imported roster — only on deployments that can read it. */
  liveRoster?: boolean;
}) {
  // Round 12 (N17): the Chats badge honors the inbox read-overrides, so
  // "Mark all as read" clears it too.
  const [unread, setUnread] = useState(() =>
    threads.reduce((n, t) => n + t.unread, 0),
  );
  useEffect(() => {
    const recount = () => {
      try {
        const overrides = JSON.parse(
          window.localStorage.getItem("lps-staff-messaging-read") ?? "{}",
        ) as Record<string, "read" | "unread">;
        setUnread(
          threads.reduce(
            (n, t) => n + (overrides[t.id] === "read" ? 0 : t.unread),
            0,
          ),
        );
      } catch {
        setUnread(threads.reduce((n, t) => n + t.unread, 0));
      }
    };
    recount();
    window.addEventListener("aos-staff-read-changed", recount);
    return () => window.removeEventListener("aos-staff-read-changed", recount);
  }, []);
  const programsDue = athletes.filter((a) => a.programDueInDays <= 5).length;
  // Round 19: the Intelligence badge counts at-risk members — slipping
  // attendance or a past-due program.
  const atRisk = athletes.filter(
    (a) =>
      a.status === "active" &&
      (a.attendancePct < 80 || a.programDueInDays < 0),
  ).length;

  // Round 14 (V18): tasks due within a day — post-mount (localStorage-backed).
  const [tasksDueSoon, setTasksDueSoon] = useState(0);
  useEffect(() => {
    const recount = () => setTasksDueSoon(dueSoonCount());
    recount();
    window.addEventListener(TASKS_EVENT, recount);
    return () => window.removeEventListener(TASKS_EVENT, recount);
  }, []);

  const items: ShellNavItem[] = [
    // Round 6: due-tracking lives in Members — the badge moved with it.
    {
      href: "/staff/athletes",
      label: "Members",
      icon: Users,
      badge: programsDue || undefined,
    },
    ...(liveRoster
      ? [
          {
            href: "/staff/roster" as Route,
            label: "Live Roster",
            icon: Database,
          } satisfies ShellNavItem,
        ]
      : []),
    { href: "/staff/programming", label: "Programs", icon: ClipboardList },
    { href: "/staff/sessions", label: "Bookings", icon: CalendarRange },
    {
      href: "/staff/messaging",
      label: "Chats",
      icon: MessagesSquare,
      badge: unread || undefined,
    },
    // Round 12 (N21): staff to-dos + member reminders in one list.
    // Round 14 (V18): the badge counts tasks overdue or due within a day.
    { href: "/staff/tasks", label: "Tasks", icon: ListTodo, badge: tasksDueSoon || undefined },
    { href: "/staff/analytics", label: "Analytics", icon: LineChart },
    // Round 19: Compliance became Intelligence and opened up to coaches —
    // members-only for them; owners/admins also get the staff workload tab.
    {
      // Cast until typedRoutes regenerates with the new segment.
      href: "/staff/intelligence" as Route,
      label: "Intelligence",
      icon: Radar,
      badge: atRisk || undefined,
    },
  ];

  if (canViewBilling(user) || canManageMemberships(user)) {
    items.push({ href: "/staff/billing", label: "Billing", icon: CreditCard });
  }

  if (isAdmin(user)) {
    items.push({ href: "/staff/team", label: "Team", icon: UserCog });
  }

  items.push({ href: "/staff/profile", label: "Profile", icon: UserRound });

  return (
    <ShellNav
      title="Team Workspace"
      subtitle={`${user.fullName} · ${user.role}`}
      items={items}
    />
  );
}
