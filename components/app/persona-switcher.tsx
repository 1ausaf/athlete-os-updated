"use client";

import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setPersona } from "@/lib/demo/actions";
import type { DemoRole } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

interface PersonaOption {
  key: DemoRole;
  label: string;
  blurb: string;
}

export function PersonaSwitcher({
  current,
  options,
}: {
  current: DemoRole;
  options: PersonaOption[];
}) {
  const [pending, startTransition] = useTransition();
  const active = options.find((o) => o.key === current) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={pending}
          aria-label="Switch demo persona"
        >
          <UserRound className="h-4 w-4" />
          <span className="hidden font-medium sm:inline">{active.label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>Viewing as</span>
          <span className="text-xs font-normal text-muted-foreground">
            Demo mode — switch roles to explore each experience.
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem
            key={o.key}
            className="flex items-start gap-3 py-2"
            onSelect={(e) => {
              e.preventDefault();
              startTransition(() => setPersona(o.key));
            }}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 items-center justify-center",
                o.key === current ? "text-brand-ink" : "text-transparent",
              )}
            >
              <Check className="h-4 w-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.blurb}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
