"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bold,
  Film,
  ImageIcon,
  Italic,
  List,
  Mic,
  Paperclip,
  Pause,
  Play,
  Send,
  Square,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ChatAttachment } from "@/lib/demo/chat";
import { cn } from "@/lib/utils";

/**
 * Round-5 WhatsApp-style composer, shared by the athlete chat and the staff
 * messaging thread:
 * - 3–4 lines tall, Enter = NEW LINE; Ctrl/Shift+Enter or the send button
 *   sends ("create a longer text form").
 * - Bold / italic via *stars* and _underscores_ exactly like WhatsApp —
 *   toolbar buttons wrap the current selection.
 * - Attach images + video files; mock voice-note recording.
 */
export function ChatComposer({
  // Round 13 (C6): one copy everywhere — athlete chat and staff threads.
  placeholder = "Write your message… (enter for a new line)",
  onSend,
  hint,
  mentionNames,
}: {
  placeholder?: string;
  onSend: (body: string, attachments: ChatAttachment[]) => void;
  hint?: ReactNode;
  /** Round 6 (X5): names offered by the @ button — mentions render highlighted. */
  mentionNames?: string[];
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [recording, setRecording] = useState(false);
  /** Round 8 (M28): elapsed seconds shown while recording. */
  const [recordSecs, setRecordSecs] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const recordStart = useRef<number>(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function insertMention(name: string) {
    const el = areaRef.current;
    const at = `@${name} `;
    if (!el) {
      setValue((v) => v + at);
    } else {
      const s = el.selectionStart;
      setValue((v) => v.slice(0, s) + at + v.slice(el.selectionEnd));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(s + at.length, s + at.length);
      });
    }
    setMentionOpen(false);
  }

  function send() {
    const body = value.trim();
    if (!body && attachments.length === 0) return;
    onSend(body, attachments);
    setValue("");
    setAttachments([]);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter inserts a newline; Ctrl+Enter / Shift+Enter sends (A13).
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      e.preventDefault();
      send();
    }
  }

  function wrapSelection(marker: string) {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e) || "text";
    const next = value.slice(0, s) + marker + selected + marker + value.slice(e);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + marker.length, s + marker.length + selected.length);
    });
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: ChatAttachment[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith("video/")) {
        next.push({ kind: "video", name: f.name, duration: "0:41" });
      } else if (f.type.startsWith("image/")) {
        next.push({ kind: "image", name: f.name });
      } else {
        next.push({ kind: "file", name: f.name });
      }
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  /** Round 7: "- " lines render as bullets — this starts one at the cursor. */
  function insertBullet() {
    const el = areaRef.current;
    if (!el) {
      setValue((v) => (v.length === 0 || v.endsWith("\n") ? v + "- " : v + "\n- "));
      return;
    }
    const s = el.selectionStart;
    const atLineStart = s === 0 || value[s - 1] === "\n";
    const insert = atLineStart ? "- " : "\n- ";
    setValue((v) => v.slice(0, s) + insert + v.slice(el.selectionEnd));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + insert.length, s + insert.length);
    });
  }

  function toggleRecord() {
    if (!recording) {
      recordStart.current = Date.now();
      setRecordSecs(0);
      setRecording(true);
      // Round 8 (M28): the button shows a live count-up while recording.
      recordTimer.current = setInterval(() => {
        setRecordSecs(
          Math.round((Date.now() - recordStart.current) / 1000),
        );
      }, 500);
      return;
    }
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
    const secs = Math.max(
      1,
      Math.round((Date.now() - recordStart.current) / 1000),
    );
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, "0");
    setAttachments((prev) => [
      ...prev,
      { kind: "voice", name: `Voice note`, duration: `${mm}:${ss}` },
    ]);
    setRecording(false);
  }

  const recordLabel = `${Math.floor(recordSecs / 60)}:${String(recordSecs % 60).padStart(2, "0")}`;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-2.5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        addFiles(e.dataTransfer.files);
      }}
    >
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <span
              key={`${i}-${"name" in a ? a.name : a.label}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium"
            >
              {a.kind === "video" ? (
                <Film className="h-3.5 w-3.5 text-muted-foreground" />
              ) : a.kind === "image" ? (
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              ) : a.kind === "voice" ? (
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {"name" in a ? a.name : a.label}
              {"duration" in a ? (
                <span className="tnum text-muted-foreground">{a.duration}</span>
              ) : null}
              <button
                type="button"
                aria-label={`Remove ${"name" in a ? a.name : a.label}`}
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, j) => j !== i))
                }
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <textarea
        ref={areaRef}
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        className="min-h-[5.5rem] w-full resize-y bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          title="Bold (*text*)"
          aria-label="Bold"
          onClick={() => wrapSelection("*")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Italic (_text_)"
          aria-label="Italic"
          onClick={() => wrapSelection("_")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Bulleted list"
          aria-label="Bulleted list"
          onClick={insertBullet}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <List className="h-4 w-4" />
        </button>
        {mentionNames && mentionNames.length > 0 ? (
          <span className="relative">
            <button
              type="button"
              title="Mention someone"
              aria-label="Mention someone"
              onClick={() => setMentionOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="text-sm font-bold">@</span>
            </button>
            {mentionOpen ? (
              <span className="absolute bottom-full left-0 z-30 mb-1 block w-48 rounded-lg border border-border bg-card p-1 shadow-raised">
                {mentionNames.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => insertMention(n)}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent"
                  >
                    @{n}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        {/* Round 13 (C4): Attach + Voice are icon-only — the words live in
            title/aria-label — so Send sits cleanly at the right. */}
        <button
          type="button"
          title="Attach photos or videos"
          aria-label="Attach photos or videos"
          onClick={() => fileRef.current?.click()}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={recording ? "Stop recording" : "Record a voice note"}
          aria-label={recording ? "Stop recording" : "Record a voice note"}
          onClick={toggleRecord}
          className={cn(
            "flex h-8 items-center justify-center rounded-md transition-colors",
            recording
              ? "gap-1.5 bg-destructive/10 px-2 text-xs font-medium text-destructive"
              : "w-8 text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {recording ? (
            <>
              <Square className="h-3.5 w-3.5 animate-pulse" />
              <span className="tnum">Recording {recordLabel}</span>
            </>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="ml-auto hidden text-[0.7rem] text-muted-foreground sm:block">
          {hint ?? "Ctrl+Enter"}
        </span>
        {/* Round 13 (C4): the hint is sm+-only, so on mobile the button
            claims the right edge itself. */}
        <Button variant="brand" size="sm" className="max-sm:ml-auto" onClick={send}>
          <Send className="h-3.5 w-3.5" />
          Send
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Message-body rendering: links + WhatsApp *bold* / _italic_          */
/* ------------------------------------------------------------------ */

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

function formatInline(text: string, keyBase: string): ReactNode[] {
  // *bold*, _italic_ (WhatsApp-style) and @mentions (round 6, X5).
  const parts: ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|@[A-Za-z][\w'-]*(?: [A-Z][\w'-]*)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("*")) {
      parts.push(<strong key={`${keyBase}-b${i}`}>{token.slice(1, -1)}</strong>);
    } else if (token.startsWith("_")) {
      parts.push(<em key={`${keyBase}-i${i}`}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(
        <span key={`${keyBase}-m${i}`} className="chat-mention">
          {token}
        </span>,
      );
    }
    last = m.index + token.length;
    i += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Render a chat body: linkify URLs, apply bold + italic markers, keep
 *  newlines; "- " lines render as bullets (round 7). */
export function renderChatBody(body: string): ReactNode {
  return body.split("\n").map((rawLine, li) => {
    const isBullet = /^\s*- /.test(rawLine);
    const line = isBullet ? rawLine.replace(/^\s*- /, "") : rawLine;
    return renderChatLine(line, li, isBullet);
  });
}

function renderChatLine(line: string, li: number, isBullet: boolean): ReactNode {
  return (
    <span
      key={li}
      className={
        isBullet
          ? "relative block min-h-[1em] pl-4 before:absolute before:left-1 before:content-['•']"
          : "block min-h-[1em]"
      }
    >
      {line.split(URL_RE).map((seg, si) =>
        /^(https?:\/\/|www\.)/.test(seg) ? (
          <a
            key={si}
            href={seg.startsWith("http") ? seg : `https://${seg}`}
            target="_blank"
            rel="noreferrer"
            className="break-all font-medium text-brand-ink underline underline-offset-2"
          >
            {seg}
          </a>
        ) : (
          formatInline(seg, `${li}-${si}`)
        ),
      )}
    </span>
  );
}

/** A voice-note bubble with 1× / 1.5× / 2× playback (round 5, A13). */
export function VoiceNoteBubble({ duration }: { duration: string }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  return (
    <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-2.5 py-1.5">
      <button
        type="button"
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        onClick={() => setPlaying((p) => !p)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink transition-colors hover:bg-brand/20"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      {/* Static waveform — demo playback */}
      <span className="flex h-5 items-end gap-[2px]" aria-hidden>
        {[3, 8, 5, 11, 7, 13, 9, 6, 12, 8, 4, 10, 6, 3].map((h, i) => (
          <span
            key={i}
            style={{ height: `${h * 1.4}px` }}
            className={cn(
              "w-[2.5px] rounded-full",
              playing ? "animate-pulse bg-brand" : "bg-muted-foreground/50",
            )}
          />
        ))}
      </span>
      <span className="tnum text-[0.7rem] text-muted-foreground">{duration}</span>
      <button
        type="button"
        aria-label={`Playback speed ${speed}× — click to change`}
        onClick={() => setSpeed(speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1)}
        className="tnum rounded-md border border-border bg-card px-1.5 py-0.5 text-[0.7rem] font-semibold transition-colors hover:bg-accent"
      >
        {speed}×
      </button>
    </span>
  );
}
