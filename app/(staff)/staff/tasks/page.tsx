import { PageHeader } from "@/components/app/page-header";
import { staffMembers } from "@/lib/demo/staff";
import { requireUserWithProfile } from "@/lib/auth";

import { TasksManager } from "./tasks-manager";

/**
 * Round 12 (N21): staff To-Do / Tasks — coach to-dos, admin-seeded projects
 * and every member's Alerts & Reminders in one list.
 */
export default async function StaffTasksPage() {
  const user = await requireUserWithProfile();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tasks"
        description="To-dos and member reminders across the whole staff — assign, complete, and keep the week visible."
      />
      <TasksManager
        currentUserName={user.fullName}
        staff={staffMembers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
