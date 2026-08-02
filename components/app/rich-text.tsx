"use client";

import {
  AtSign,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { staffMembers } from "@/lib/demo/staff";
import { cn } from "@/lib/utils";

/**
 * Trello-style note canvas: a contentEditable surface that grows with its
 * content plus a small formatting toolbar — bold, italic, bullets, numbers,
 * three heading levels, highlight, and (round 6) links + @mentions:
 * "highlight and turn it into a URL" / "tag a team member using @".
 * Demo-local content only; the HTML never leaves the browser.
 */

const BLOCK_OPTIONS = [
  { label: "H1", block: "h1", icon: Heading1, title: "Heading 1" },
  { label: "H2", block: "h2", icon: Heading2, title: "Heading 2" },
  { label: "H3", block: "h3", icon: Heading3, title: "Heading 3" },
] as const;

export interface RichTextComposerProps {
  placeholder?: string;
  /** Called with the current HTML whenever content changes. */
  onChangeHtml?: (html: string) => void;
  /** Imperative reset counter — bump to clear the composer. */
  resetKey?: number;
  className?: string;
  /** Rendered under the toolbar, right-aligned (e.g. the save button). */
  actions?: ReactNode;
}

export function RichTextComposer({
  placeholder = "Write a note…",
  onChangeHtml,
  resetKey = 0,
  className,
  actions,
}: RichTextComposerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);
  const [mentionOpen, setMentionOpen] = useState(false);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const text = el.textContent?.trim() ?? "";
    setEmpty(text.length === 0);
    onChangeHtml?.(text.length === 0 ? "" : el.innerHTML);
  };

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emit();
  };

  /** Round 6 (P6): highlight text → wrap it in a link. */
  const makeLink = () => {
    ref.current?.focus();
    const selected = window.getSelection()?.toString().trim() ?? "";
    const input = window.prompt(
      "Link URL",
      /^https?:\/\//.test(selected) ? selected : "https://",
    );
    if (!input) return;
    const url = /^https?:\/\//.test(input) ? input : `https://${input}`;
    document.execCommand("createLink", false, url);
    emit();
  };

  /** Round 6 (P7): insert an @mention chip for a team member. */
  const insertMention = (name: string) => {
    ref.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<strong class="mention">@${name}</strong>&nbsp;`,
    );
    setMentionOpen(false);
    emit();
  };

  const toolBtn = (
    title: string,
    onClick: () => void,
    icon: ReactNode,
  ) => (
    <Button
      key={title}
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onMouseDown={(e) => {
        // Keep the selection inside the editable area.
        e.preventDefault();
        onClick();
      }}
    >
      {icon}
    </Button>
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface focus-within:border-brand/50",
        className,
      )}
    >
      <div className="relative flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
        {toolBtn("Bold", () => exec("bold"), <Bold className="h-3.5 w-3.5" />)}
        {toolBtn("Italic", () => exec("italic"), <Italic className="h-3.5 w-3.5" />)}
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
        {toolBtn("Bulleted list", () => exec("insertUnorderedList"), <List className="h-3.5 w-3.5" />)}
        {toolBtn("Numbered list", () => exec("insertOrderedList"), <ListOrdered className="h-3.5 w-3.5" />)}
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
        {BLOCK_OPTIONS.map((o) =>
          toolBtn(o.title, () => exec("formatBlock", o.block), <o.icon className="h-3.5 w-3.5" />),
        )}
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
        {toolBtn("Highlight", () => exec("hiliteColor", "hsl(53 96% 74%)"), <Highlighter className="h-3.5 w-3.5" />)}
        {toolBtn("Link (highlight text first)", makeLink, <Link2 className="h-3.5 w-3.5" />)}
        {toolBtn(
          "Mention a team member",
          () => setMentionOpen((o) => !o),
          <AtSign className="h-3.5 w-3.5" />,
        )}

        {mentionOpen ? (
          <div className="absolute right-1 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-card p-1 shadow-raised">
            {staffMembers.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(s.name);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <span className="font-medium">@{s.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        {empty ? (
          <p
            className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground"
            aria-hidden
          >
            {placeholder}
          </p>
        ) : null}
        <div
          key={resetKey}
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          className="rich-text min-h-[4.5rem] px-3 py-2.5 text-sm outline-none"
          onInput={emit}
          onBlur={emit}
          onKeyDown={(e) => {
            // Typing "@" opens the team-member picker (round 6, P7).
            if (e.key === "@") setMentionOpen(true);
            else if (e.key === "Escape") setMentionOpen(false);
          }}
          onPaste={(e) => {
            // Paste as plain text so outside formatting never leaks in.
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
            emit();
          }}
          suppressContentEditableWarning
        />
      </div>

      {actions ? (
        <div className="flex items-center justify-end gap-2 border-t border-border px-2 py-1.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Renders stored note HTML (demo-authored content only — never remote input). */
export function RichTextView({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rich-text text-sm", className)}
      // Demo data + locally-composed notes only; nothing untrusted renders here.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
