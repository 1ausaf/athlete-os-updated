import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Placeholder for OAuth / magic-link callback flows.
 *
 * Email/password sign-in uses `/auth/sign-in` and a server action. For PKCE
 * or magic links, a Route Handler should call `exchangeCodeForSession` and
 * redirect by role (athlete → `/athlete/dashboard`, staff → `/staff/athletes`).
 */
export default function AuthCallbackPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Signing you in
        </CardTitle>
        <CardDescription>
          Exchanging your secure code for a session, then routing you to the
          right workspace.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          This page is a placeholder for email magic links or OAuth callbacks.
          Use password sign-in at /auth/sign-in until this flow is implemented.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/sign-in">Back to sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/athlete/dashboard">Continue (dev)</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
