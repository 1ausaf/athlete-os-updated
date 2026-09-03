import "server-only";

import { headers } from "next/headers";

// eslint-disable-next-line no-restricted-imports -- allowed importer: audit_logs is append-only via service role; no user-session write path exists
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Append-only security event logging into public.audit_logs (service-role
 * writes; owner/admin tenant-scoped reads; no API update/delete path).
 * Fire-and-forget by design: logging must never take down an auth flow,
 * and a deployment without the service key simply logs to stdout.
 */

export type SecurityAction =
  | "login"
  | "failed_login"
  | "login_denied_no_membership"
  | "logout"
  | "password_reset_requested"
  | "password_changed"
  | "session_exchange"
  | "invitation_created"
  | "invitation_accepted"
  | "membership_changed"
  | "role_change"
  | "tenant_suspended"
  | "domain_changed"
  | "destructive_operation";

export interface SecurityEvent {
  action: SecurityAction;
  tenantId?: string | null;
  actorUserId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

function requestMeta(): { ip: string | null; ua: string | null } {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    return {
      ip: fwd ? fwd.split(",")[0]!.trim() : null,
      ua: h.get("user-agent"),
    };
  } catch {
    return { ip: null, ua: null }; // outside a request scope
  }
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const { ip, ua } = requestMeta();
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(`[audit:noop] ${event.action}`, {
        tenantId: event.tenantId ?? null,
      });
      return;
    }
    const supabase = createSupabaseServiceRoleClient();
    await supabase.from("audit_logs").insert({
      tenant_id: event.tenantId ?? null,
      actor_user_id: event.actorUserId ?? null,
      action: event.action,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      metadata: (event.metadata ?? {}) as never,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (err) {
    // Never let audit failures break an auth flow — server log only.
    console.error("[audit:error]", event.action, err);
  }
}
