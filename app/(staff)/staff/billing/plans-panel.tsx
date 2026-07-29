"use client";

import { useState } from "react";
import { BadgePercent, CreditCard, Pencil, Plus, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { PLAN_CADENCES, athletes, money, plans, type Plan } from "@/lib/demo/data";
import { trainingGroups } from "@/lib/demo/training";

import { BillingDialog } from "./billing-dialog";

/** Editable fields shared by the edit + add dialogs. */
interface PlanDraft {
  name: string;
  priceDollars: string;
  cadence: string;
  discountPct: string;
  customFor: string;
}

function draftFrom(plan: Plan): PlanDraft {
  return {
    name: plan.name,
    priceDollars: (plan.priceCents / 100).toFixed(0),
    cadence: plan.cadence,
    discountPct: String(plan.discountPct ?? 0),
    customFor: plan.customFor ?? "",
  };
}

const EMPTY_DRAFT: PlanDraft = {
  name: "",
  priceDollars: "",
  cadence: "Monthly",
  discountPct: "0",
  customFor: "",
};

/**
 * O3 — membership plans are editable (price, billing cadence, discount) and
 * new plans can be added, including custom one-client plans. Local demo state.
 */
export function PlansPanel() {
  const [rows, setRows] = useState<Plan[]>(() => plans.map((p) => ({ ...p })));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const editing = rows.find((p) => p.id === editingId) ?? null;

  function applyEdit(draft: PlanDraft) {
    if (!editingId) return;
    setRows((prev) =>
      prev.map((p) =>
        p.id === editingId
          ? {
              ...p,
              priceCents: Math.max(
                0,
                Math.round(parseFloat(draft.priceDollars || "0") * 100),
              ),
              cadence: draft.cadence,
              period: draft.cadence,
              discountPct: Number(draft.discountPct) > 0
                ? Number(draft.discountPct)
                : undefined,
            }
          : p,
      ),
    );
    setEditingId(null);
  }

  function applyAdd(draft: PlanDraft) {
    const name = draft.name.trim();
    if (!name) return;
    setRows((prev) => [
      ...prev,
      {
        id: `plan-local-${Date.now()}`,
        name,
        priceCents: Math.max(
          0,
          Math.round(parseFloat(draft.priceDollars || "0") * 100),
        ),
        frequency: "Custom",
        sessionsPerPeriod: "Set with the client",
        period: draft.cadence,
        cadence: draft.cadence,
        discountPct:
          Number(draft.discountPct) > 0 ? Number(draft.discountPct) : undefined,
        customFor: draft.customFor || undefined,
        access: draft.customFor
          ? "Custom plan for one client"
          : "Custom plan",
        activeMembers: 0,
      },
    ]);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-lg">Membership plans</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Prices, cadences and discounts save locally in this demo.
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((plan) => (
          <Card
            key={plan.id}
            className={
              plan.popular
                ? "relative overflow-hidden bg-brand-sheen ring-1 ring-brand/30"
                : "relative overflow-hidden"
            }
          >
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.access}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {plan.popular ? <Pill tone="brand">Popular</Pill> : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${plan.name} plan`}
                    onClick={() => setEditingId(plan.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 empty:hidden">
                {plan.customFor ? (
                  <Pill tone="info" icon={<UserRound className="h-3 w-3" />}>
                    Custom · {plan.customFor}
                  </Pill>
                ) : null}
                {plan.discountPct ? (
                  <Pill
                    tone="success"
                    icon={<BadgePercent className="h-3 w-3" />}
                  >
                    {plan.discountPct}% off
                  </Pill>
                ) : null}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="tnum font-display text-3xl font-extrabold tracking-tight">
                  {money(plan.priceCents)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {plan.cadence.toLowerCase()}
                </span>
              </div>
              <dl className="mt-auto flex flex-col gap-1.5 text-xs">
                <PlanRow label="Billing cadence" value={plan.cadence} />
                <PlanRow label="Frequency" value={plan.frequency} />
                <PlanRow label="Sessions" value={plan.sessionsPerPeriod} />
              </dl>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  Active members
                </span>
                <span className="tnum text-sm font-bold">
                  {plan.activeMembers}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add-plan affordance */}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-5 text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Plus className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Add plan</span>
          <span className="max-w-52 text-center text-xs">
            Any cadence from weekly to yearly, discounts, or a custom plan for
            a single client.
          </span>
        </button>
      </div>

      {editing ? (
        <PlanDialog
          title={`Edit ${editing.name}`}
          subtitle="Price, billing cadence and discount — changes apply immediately."
          initial={draftFrom(editing)}
          mode="edit"
          onClose={() => setEditingId(null)}
          onSave={applyEdit}
        />
      ) : null}
      {adding ? (
        <PlanDialog
          title="Add plan"
          subtitle="A new baseline plan — or a custom plan for one client."
          initial={EMPTY_DRAFT}
          mode="add"
          onClose={() => setAdding(false)}
          onSave={applyAdd}
        />
      ) : null}
    </div>
  );
}

function PlanDialog({
  title,
  subtitle,
  initial,
  mode,
  onClose,
  onSave,
}: {
  title: string;
  subtitle: string;
  initial: PlanDraft;
  mode: "edit" | "add";
  onClose: () => void;
  onSave: (draft: PlanDraft) => void;
}) {
  const [draft, setDraft] = useState<PlanDraft>(initial);
  const set = <K extends keyof PlanDraft>(key: K, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const valid =
    (mode === "edit" || draft.name.trim().length > 0) &&
    parseFloat(draft.priceDollars || "0") > 0;

  return (
    <BillingDialog title={title} subtitle={subtitle} onClose={onClose}>
      {mode === "add" ? (
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Plan name</Label>
          <Input
            value={draft.name}
            autoFocus
            placeholder="e.g. Team — Quest Track Club"
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Price (CAD)</Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={draft.priceDollars}
            onChange={(e) => set("priceDollars", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Billing cadence
          </Label>
          <select
            value={draft.cadence}
            aria-label="Billing cadence"
            onChange={(e) => set("cadence", e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            {PLAN_CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">
          Discount % (0 = none)
        </Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={draft.discountPct}
          onChange={(e) => set("discountPct", e.target.value)}
        />
      </div>
      {mode === "add" ? (
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Custom for a single client (optional)
          </Label>
          <select
            value={draft.customFor}
            aria-label="Custom plan client"
            onChange={(e) => set("customFor", e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="">Everyone — baseline plan</option>
            <optgroup label="Athletes">
              {athletes.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Teams">
              {trainingGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          Saves locally in this demo.
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={!valid}
            onClick={() => onSave(draft)}
          >
            {mode === "add" ? "Add plan" : "Save changes"}
          </Button>
        </div>
      </div>
    </BillingDialog>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground/90">{value}</dd>
    </div>
  );
}
