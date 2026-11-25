import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { photosApi, type ProgressPhoto } from "@/lib/api";

const ANGLES = ["front", "side", "back", "other"] as const;
const ANGLE_LABELS: Record<string, string> = { front: "Front", side: "Side", back: "Back", other: "Other" };

// Group photos by takenAt date
function groupByDate(photos: ProgressPhoto[]) {
  const map = new Map<string, ProgressPhoto[]>();
  for (const p of photos) {
    const list = map.get(p.takenAt) ?? [];
    list.push(p);
    map.set(p.takenAt, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photos, startIndex, onClose }: { photos: ProgressPhoto[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const photo = photos[idx]!;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(photos.length - 1, i + 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photos.length, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="size-5" />
      </button>

      <div className="relative flex w-full max-w-lg items-center justify-center px-12" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="absolute left-0 grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>

        <img
          src={photosApi.url(photo.filename)}
          alt={ANGLE_LABELS[photo.angle]}
          className="max-h-[70vh] w-full rounded-2xl object-contain"
        />

        <button
          onClick={() => setIdx((i) => Math.min(photos.length - 1, i + 1))}
          disabled={idx === photos.length - 1}
          className="absolute right-0 grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-white">{ANGLE_LABELS[photo.angle]} · {formatDate(photo.takenAt)}</p>
        {photo.note && <p className="mt-1 text-xs text-white/60">{photo.note}</p>}
        <p className="mt-2 text-[11px] text-white/40">{idx + 1} / {photos.length}</p>
      </div>
    </motion.div>
  );
}

// ── Upload Sheet ──────────────────────────────────────────────────────────────
function UploadSheet({ onClose, onUploaded }: { onClose: () => void; onUploaded: (p: ProgressPhoto) => void }) {
  const [angle, setAngle] = useState<typeof ANGLES[number]>("front");
  const [note, setNote] = useState("");
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function handleSubmit() {
    if (!file) { setError("Please select a photo first"); return; }
    setUploading(true);
    try {
      const { photo } = await photosApi.upload(file, angle, note, takenAt);
      onUploaded(photo);
      onClose();
    } catch {
      setError("Upload failed — check your connection and try again");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl bg-card px-5 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))]"
      >
        <div className="mx-auto mt-3 mb-5 h-1 w-10 rounded-full bg-muted" />
        <h3 className="mb-5 font-display text-lg font-bold">Add Progress Photo</h3>

        {/* Photo picker */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {preview ? (
          <div className="relative mb-4 overflow-hidden rounded-2xl bg-muted">
            <img src={preview} alt="preview" className="max-h-72 w-full object-contain" />
            <button
              onClick={() => { setPreview(null); setFile(null); }}
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="mb-4 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Camera className="size-7" />
            <span className="text-sm">Tap to take photo or choose from library</span>
          </button>
        )}

        {/* Angle chips */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Angle</p>
          <div className="flex gap-2">
            {ANGLES.map((a) => (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  angle === a ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {ANGLE_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Date</p>
          <input
            type="date"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            className="h-10 w-full rounded-xl bg-muted px-3 text-sm text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Note */}
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Note (optional)</p>
          <input
            type="text"
            placeholder="e.g. Week 4 check-in, 78kg"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-10 w-full rounded-xl bg-muted px-3 text-sm placeholder:text-muted-foreground/60 border-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

        <Button
          size="lg"
          className="h-12 w-full rounded-2xl"
          disabled={uploading || !file}
          onClick={handleSubmit}
        >
          {uploading ? "Uploading…" : "Save photo"}
        </Button>
      </motion.div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: ProgressPhoto[]; index: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    photosApi.list()
      .then(({ photos }) => setPhotos(photos))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = groupByDate(photos);
  const allPhotos = photos; // flat list for lightbox navigation

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await photosApi.delete(id);
      setPhotos((prev) => prev.filter((p) => p._id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="mb-3 h-4 w-32 rounded bg-muted" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((j) => <div key={j} className="aspect-square rounded-2xl bg-muted" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {photos.length === 0 ? "Front, side and back every 4 weeks shows the clearest change." : `${photos.length} photo${photos.length !== 1 ? "s" : ""} saved`}
        </p>
        <Button size="sm" className="gap-1.5 rounded-2xl" onClick={() => setUploadOpen(true)}>
          <Plus className="size-3.5" />
          Add photo
        </Button>
      </div>

      {photos.length === 0 ? (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setUploadOpen(true)}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/60 py-16 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-muted">
            <Camera className="size-6" />
          </span>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No progress photos yet</p>
            <p className="mt-1 text-xs">Tap to add your first photo</p>
          </div>
        </motion.button>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, groupPhotos]) => (
            <div key={date}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {formatDate(date)}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {groupPhotos.map((photo) => {
                  const flatIdx = allPhotos.findIndex((p) => p._id === photo._id);
                  return (
                    <motion.div
                      key={photo._id}
                      layout
                      className="group relative aspect-square overflow-hidden rounded-2xl bg-muted"
                    >
                      <img
                        src={photosApi.url(photo.filename)}
                        alt={ANGLE_LABELS[photo.angle]}
                        className="size-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                        onClick={() => setLightbox({ photos: allPhotos, index: flatIdx })}
                      />
                      {/* Angle label */}
                      <span className="absolute bottom-1.5 left-1.5 rounded-lg bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {ANGLE_LABELS[photo.angle]}
                      </span>
                      {/* Delete button — always visible on touch, hover-only on desktop */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(photo._id); }}
                        disabled={deleting === photo._id}
                        className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-opacity hover:bg-destructive"
                        aria-label="Delete photo"
                      >
                        {deleting === photo._id
                          ? <span className="size-3 animate-spin rounded-full border border-white border-t-transparent" />
                          : <Trash2 className="size-3" />}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {uploadOpen && (
          <UploadSheet
            onClose={() => setUploadOpen(false)}
            onUploaded={(p) => setPhotos((prev) => [p, ...prev])}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <Lightbox
            photos={lightbox.photos}
            startIndex={lightbox.index}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
