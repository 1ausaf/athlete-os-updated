"use client";

import { createContext, useContext } from "react";

/**
 * Collapsed state of the desktop sidebar. Provided by AppShell; consumed by
 * ShellNav so nav items can render icon-only when the rail is collapsed.
 * Defaults to expanded for the mobile drawer (which never collapses).
 */
export const SidebarContext = createContext<{ collapsed: boolean }>({
  collapsed: false,
});

export function useSidebar() {
  return useContext(SidebarContext);
}
