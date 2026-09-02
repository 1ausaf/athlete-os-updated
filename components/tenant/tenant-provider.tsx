"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { TenantPublic } from "@/lib/tenant/types";

/**
 * Client-side tenant identity, hydrated by the server group layouts. Client
 * components read the workspace name/logo/white-label flag through
 * useTenant() instead of hard-coded brand strings.
 */

const DEFAULT_TENANT: TenantPublic = {
  id: "demo",
  slug: "demo",
  name: "LPS Athletic",
  logoUrl: null,
  whiteLabel: true,
  supportLine: "billing@lpsathletic.com — LPS Athletic, North York, ON",
};

const TenantContext = createContext<TenantPublic>(DEFAULT_TENANT);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantPublic | null;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant ?? DEFAULT_TENANT}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantPublic {
  return useContext(TenantContext);
}
