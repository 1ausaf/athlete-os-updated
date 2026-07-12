import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface PlaceholderPageProps {
  eyebrow?: string;
  title: string;
  description: string;
  nextUp?: string[];
  children?: ReactNode;
}

/**
 * Lightweight stub used for scaffolded routes. Replace each page with its
 * real implementation as features land.
 */
export function PlaceholderPage({
  eyebrow,
  title,
  description,
  nextUp,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      {nextUp && nextUp.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next up</CardTitle>
            <CardDescription>
              Planned work for this surface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {nextUp.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {children}
    </div>
  );
}
