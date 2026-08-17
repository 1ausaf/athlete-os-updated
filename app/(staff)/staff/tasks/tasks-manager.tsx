"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { allTasks, TASKS_EVENT, type StaffTask } from "@/lib/demo/tasks";

/**
 * Round 12 (N21): the Tasks list. Placeholder shell — the full manager
 * (To Do | Completed tabs, add/assign form, reminder roll-up) lands with the
 * round-12 implementation pass.
 */
export function TasksManager({
  currentUserName,
  staff,
}: {
  currentUserName: string;
  staff: { id: string; name: string }[];
}) {
  const [tasks, setTasks] = useState<StaffTask[]>([]);

  useEffect(() => {
    const refresh = () => setTasks(allTasks());
    refresh();
    window.addEventListener(TASKS_EVENT, refresh);
    return () => window.removeEventListener(TASKS_EVENT, refresh);
  }, []);

  return (
    <Card>
      <CardContent className="p-5 text-sm text-muted-foreground">
        {tasks.length} tasks loaded for {staff.length} staff —{" "}
        {currentUserName}.
      </CardContent>
    </Card>
  );
}
