import { redirect } from "next/navigation";

/** Round 19: Compliance became Intelligence — keep old links working. */
export default function LegacyCompliancePage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  redirect(
    searchParams?.tab === "staff"
      ? "/staff/intelligence?tab=staff"
      : "/staff/intelligence",
  );
}
