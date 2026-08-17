"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";

/**
 * Round 12 (N20): avatar upload with a real crop step. Picking a file opens a
 * crop dialog — circular mask, zoom slider, drag to reposition — and "Save
 * photo" draws the visible crop to a canvas; that data URL then renders in
 * place of the initials avatar. Demo-local: state plus optional localStorage.
 */

/** Circular mask diameter in px (~14rem). */
const MASK = 224;
/** Exported crop edge in px. */
const OUT = 256;

export function AvatarUpload({
  initials,
  hue,
  name,
  uploadLabel,
  storageKey,
}: {
  initials: string;
  hue: number;
  name: string;
  /** R23 — override for non-photo uploads, e.g. "Upload logo (demo)". */
  uploadLabel?: string;
  /** When set, the cropped photo persists under this localStorage key. */
  storageKey?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  // Crop dialog state — an object URL for the picked file, plus zoom + pan.
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setPhoto(saved);
    } catch {
      /* blocked/corrupted storage — initials fallback stands */
    }
  }, [storageKey]);

  // Escape closes the crop dialog, like the other overlay dialogs.
  useEffect(() => {
    if (!pickedUrl) return;
    const url = pickedUrl;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        URL.revokeObjectURL(url);
        setPickedUrl(null);
        setNatural(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickedUrl]);

  function openPicker() {
    fileRef.current?.click();
  }

  function onPick(file: File | undefined) {
    if (!file) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
    setPickedUrl(URL.createObjectURL(file));
  }

  function closeDialog() {
    if (pickedUrl) URL.revokeObjectURL(pickedUrl);
    setPickedUrl(null);
    setNatural(null);
  }

  // The image displays at natural * base so its short edge fills the mask at
  // zoom 1; the canvas below re-applies the exact same math scaled to OUT.
  const base = natural ? MASK / Math.min(natural.w, natural.h) : 0;

  function savePhoto() {
    const img = imgRef.current;
    if (!img || !natural) return;
    const scale = base * zoom;
    const k = OUT / MASK;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(
      img,
      (MASK / 2 + offset.x - (natural.w * scale) / 2) * k,
      (MASK / 2 + offset.y - (natural.h * scale) / 2) * k,
      natural.w * scale * k,
      natural.h * scale * k,
    );
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhoto(dataUrl);
    setUpdated(true);
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, dataUrl);
      } catch {
        /* storage full/blocked — the photo still shows this session */
      }
    }
    closeDialog();
  }

  return (
    <span className="relative inline-flex shrink-0">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={name}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <AthleteAvatar initials={initials} hue={hue} size="xl" />
      )}
      <button
        type="button"
        onClick={openPicker}
        aria-label={uploadLabel ?? `Change ${name}'s photo`}
        title={
          updated
            ? "Updated (saves locally in this demo)"
            : (uploadLabel ?? "Change photo")
        }
        className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
      >
        {updated ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* The crop dialog — hand-rolled fixed overlay like the billing ones */}
      {pickedUrl ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden
            onClick={closeDialog}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={uploadLabel ?? "Crop photo"}
            className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-card shadow-raised"
          >
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Camera className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-base">Crop photo</h3>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close crop dialog"
                className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 p-5">
              {/* Circular mask — drag inside to reposition */}
              <div
                className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-full border border-border bg-muted active:cursor-grabbing"
                style={{ width: MASK, height: MASK }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dragFrom.current = { x: e.clientX, y: e.clientY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  const from = dragFrom.current;
                  if (!from) return;
                  const dx = e.clientX - from.x;
                  const dy = e.clientY - from.y;
                  dragFrom.current = { x: e.clientX, y: e.clientY };
                  setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
                }}
                onPointerUp={() => (dragFrom.current = null)}
                onPointerCancel={() => (dragFrom.current = null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={pickedUrl}
                  alt=""
                  draggable={false}
                  onLoad={(e) =>
                    setNatural({
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    })
                  }
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: natural ? natural.w * base : undefined,
                    height: natural ? natural.h * base : undefined,
                    visibility: natural ? "visible" : "hidden",
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  }}
                />
              </div>

              <label className="flex w-full items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Zoom
                </span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  aria-label="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-[hsl(var(--brand))]"
                />
              </label>
              <p className="text-center text-[0.7rem] text-muted-foreground">
                Drag to reposition, zoom to fit. Saves locally in this demo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button variant="ghost" size="sm" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={!natural}
                onClick={savePhoto}
              >
                Save photo
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </span>
  );
}
