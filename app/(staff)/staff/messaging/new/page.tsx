import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";

import { NewThreadForm } from "./new-thread-form";

export default async function StaffNewMessagingPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  const admin = isAdmin(user);

  // C20: coaches cannot start threads — conversations are created from coach
  // assignments so no private coach↔athlete chat can ever exist (Safe-Sport).
  if (!admin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Team Workspace · Chats"
          title="New thread"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href={"/staff/messaging" as Route}>
                <ArrowLeft className="h-4 w-4" />
                Inbox
              </Link>
            </Button>
          }
        />

        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-2xl">Coaches don&rsquo;t start threads</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
                Threads are created automatically when you&rsquo;re assigned to
                an athlete — coaches can&rsquo;t start private chats
                (Safe-Sport). Need a conversation that doesn&rsquo;t exist yet?
                Ask an admin to assign you or open it.
              </p>
            </div>
            <Button asChild variant="brand" size="sm">
              <Link href={"/staff/messaging" as Route}>
                <ArrowLeft className="h-4 w-4" />
                Back to inbox
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Team Workspace · Chats"
        title="New thread"
        description="Start a conversation with an athlete. If the athlete is a minor, their parents are added to the chat automatically."
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
