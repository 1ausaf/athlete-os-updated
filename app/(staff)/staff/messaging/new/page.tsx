import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

import { NewThreadForm } from "./new-thread-form";

export default async function StaffNewMessagingPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Messaging"
        title="New thread"
        description="Start a conversation with an athlete. If the athlete is a minor, Safe-Sport Rule of Two requires a second adult before the thread can open — no admin override is permitted."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={"/staff/messaging" as Route}>
              <ArrowLeft className="h-4 w-4" />
              Inbox
            </Link>
          </Button>
        }
      />

      <NewThreadForm />
    </div>
  );
}
