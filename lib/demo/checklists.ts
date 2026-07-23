/**
 * Member checklists (C26) — near-verbatim from the client's Trello template
 * card ("FIRST LAST [Sports, M, YYYY]"): Onboarding, Returning Member and
 * Member Exit, with [ADMIN]/[COACH] ownership tags. Tool names that the AOS
 * replaces (TrainHeroic access codes, Trello moves) are adapted to the app.
 */

export interface ChecklistItem {
  label: string;
  owner: "ADMIN" | "COACH";
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export const checklistTemplates: ChecklistTemplate[] = [
  {
    id: "onboarding",
    name: "Onboarding Process",
    items: [
      { owner: "ADMIN", label: "Send waiver from train@lpsathletic.com, save signed copy to the athlete's Drive Docs folder + fill info into their card" },
      { owner: "ADMIN", label: "Create Google Drive folder in Members & Partners + a Docs subfolder, link it on the card" },
      { owner: "ADMIN", label: "Create Square customer (parent name first if the parent pays) + link the customer profile here" },
      { owner: "ADMIN", label: "Create invoice (assessment fee, training) and/or set up the recurring invoice" },
      { owner: "ADMIN", label: "Create their AOS account + program, set auto-publish (5:00 AM, 4 days ahead), send the app invite" },
      { owner: "ADMIN", label: "Add contact to Google Contacts (labels, birthday) + Brevo (Status: Active, 3 lists) + link both here" },
      { owner: "ADMIN", label: "Add Quo (OpenPhone) conversation link to the card" },
      { owner: "ADMIN", label: "Start the Remapping Assessment record + fill name, date of birth, sex" },
      { owner: "ADMIN", label: "Schedule the Remapping Assessment + send the calendar invite" },
      { owner: "ADMIN", label: "Move card to Onboard, assign the assessment tester / coach" },
      { owner: "ADMIN", label: "Set the card's due date (day after testing) with a reminder at time of due date" },
      { owner: "ADMIN", label: "Schedule welcome email (25 min into the scheduled assessment)" },
      { owner: "ADMIN", label: "Invite to the WhatsApp community groups (athlete + parents) and create the private LPS × athlete group" },
      { owner: "ADMIN", label: "Add Google Alert for the athlete's full name + sport" },
      { owner: "ADMIN", label: "Set reminder to ask for a Google review (8 weeks in)" },
      { owner: "COACH", label: "Renpho scale: set up name + record first body-comp measurement (save to Drive Docs)" },
      { owner: "COACH", label: "Record photo/video of assessment movements (muscle snatch OHS, squats, split squats, chin ups, push ups)" },
      { owner: "COACH", label: "Provide copy of the book + let them know they need to read it" },
      { owner: "COACH", label: "Select the training + nutrition plan dropdowns (gym/away frequency, nutrition protocol)" },
      { owner: "COACH", label: "Move card to top of the proper list, add coach(es) as members, tag the programming coach with your assessment report" },
      { owner: "COACH", label: "Write the assessment report for the other coaches as a note" },
      { owner: "COACH", label: "Design the program + notify the client when it's ready" },
      { owner: "ADMIN", label: "Copy the right nutrition protocol (21-Day Fat Burner / Muscle Mass / Performance Build) into their Docs folder" },
    ],
  },
  {
    id: "returning",
    name: "Returning Member Process",
    items: [
      { owner: "ADMIN", label: "Move the member's card from Inactive back to the right OP list (in-gym / online)" },
      { owner: "ADMIN", label: "ActiveCampaign: swap Status: Inactive → Client, re-add sport tags + Member Journey automation" },
      { owner: "ADMIN", label: "Reactivate their program access (or rebuild it) + set auto-publish 5:00 AM, 4 days ahead" },
      { owner: "ADMIN", label: "Re-add member to the private LPS members-only site" },
      { owner: "ADMIN", label: "Square: reactivate the recurring invoice" },
      { owner: "ADMIN", label: "Schedule the welcome-back email (25 min into their scheduled assessment)" },
    ],
  },
  {
    id: "exit",
    name: "Member Exit Process",
    items: [
      { owner: "ADMIN", label: "Move the member's card to Inactive" },
      { owner: "ADMIN", label: "ActiveCampaign: remove Status: Client, add Status: Inactive" },
      { owner: "ADMIN", label: "Remove from the private LPS members-only site" },
      { owner: "ADMIN", label: "Remove from the WhatsApp community groups (athlete + parent)" },
      { owner: "ADMIN", label: "Unpublish any programmed workouts" },
      { owner: "ADMIN", label: "Square: pause or cancel active recurring invoices" },
    ],
  },
];

export function checklistTemplateById(id: string): ChecklistTemplate | undefined {
  return checklistTemplates.find((t) => t.id === id);
}

/** Per-athlete checklist state: which template + which boxes are ticked. */
export interface AthleteChecklist {
  templateId: string;
  checked: boolean[];
}

export const athleteChecklists: Record<string, AthleteChecklist[]> = {
  // Andre is mid-onboarding — 18 of 23 done, the [COACH] tail outstanding.
  "ath-dre": [
    {
      templateId: "onboarding",
      checked: checklistTemplates[0]!.items.map((_, i) => i < 18),
    },
  ],
  // Noah just joined — the admin front half is underway.
  "ath-noah": [
    {
      templateId: "onboarding",
      checked: checklistTemplates[0]!.items.map((_, i) => i < 9),
    },
  ],
};
