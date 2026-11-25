import { Bell, BellOff, Bot, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGroqKey, setGroqKey, pushApi } from "@/lib/api";
import { usePushNotifications } from "@/lib/usePushNotifications";

export const NOTIF_DEFAULTS = {
  morning: "06:00",
  food: "12:00",
  workout: "20:00",
  weight: "21:00",
};

export function loadNotifTimes() {
  try {
    const saved = localStorage.getItem("ls_notif_times");
    return saved ? { ...NOTIF_DEFAULTS, ...JSON.parse(saved) } : { ...NOTIF_DEFAULTS };
  } catch {
    return { ...NOTIF_DEFAULTS };
  }
}

export function saveNotifTimes(times: typeof NOTIF_DEFAULTS) {
  localStorage.setItem("ls_notif_times", JSON.stringify(times));
}

function fmt12(val: string) {
  const [h, m] = val.split(":").map(Number);
  const ampm = h! >= 12 ? "PM" : "AM";
  const h12 = h! % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function NotificationsSection() {
  const { permission, subscribed, loading, supported, subscribe, unsubscribe } = usePushNotifications();
  const [times, setTimes] = useState(loadNotifTimes);

  function updateTime(key: keyof typeof NOTIF_DEFAULTS, val: string) {
    const next = { ...times, [key]: val };
    setTimes(next);
    saveNotifTimes(next);
    pushApi.updateTimes(next).catch(() => {});
    toast.success("Notification time saved");
  }

  const notifications: { key: keyof typeof NOTIF_DEFAULTS; label: string; detail: string }[] = [
    { key: "morning", label: "Morning motivation", detail: "AI-generated based on your goal & weight trend" },
    { key: "food", label: "Food log reminder", detail: "Only if you haven't logged food yet" },
    { key: "workout", label: "Workout reminder", detail: "Only if no workout logged today" },
    { key: "weight", label: "Weight log reminder", detail: "Only if weight not logged today" },
  ];

  return (
    <section>
      <SectionHeader title="Notifications" />
      <div className="surface-card rounded-3xl p-5 space-y-4">
        {!supported && (
          <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>
        )}

        {supported && permission === "denied" && (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked. Enable them in your browser settings, then reload.
          </p>
        )}

        {supported && permission !== "denied" && (
          <>
            <div className="flex items-start gap-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-2xl ${subscribed ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {subscribed ? <Bell className="size-4" /> : <BellOff className="size-4" />}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{subscribed ? "Notifications on" : "Enable notifications"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subscribed
                    ? "You'll receive daily reminders and AI suggestions."
                    : "Get daily motivation, food/workout reminders, and weight log prompts."}
                </p>
              </div>
              <Button
                size="sm"
                variant={subscribed ? "secondary" : "default"}
                className="rounded-2xl shrink-0"
                disabled={loading}
                onClick={subscribed ? unsubscribe : subscribe}
              >
                {loading ? "..." : subscribed ? "Turn off" : "Turn on"}
              </Button>
            </div>

            {subscribed && (
              <ul className="space-y-2">
                {notifications.map((n) => (
                  <li key={n.key} className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{n.label}</p>
                      <p className="text-[10px] text-muted-foreground">{n.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-primary hidden sm:block">{fmt12(times[n.key])}</span>
                      <input
                        type="time"
                        value={times[n.key]}
                        onChange={(e) => updateTime(n.key, e.target.value)}
                        className="rounded-xl bg-muted border-0 px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function AiKeysSection() {
  const [groqKey, setGroqKeyState] = useState(getGroqKey);
  const [show, setShow] = useState(false);

  function save() {
    setGroqKey(groqKey.trim());
    toast.success(groqKey.trim() ? "Groq API key saved" : "Groq API key cleared");
  }

  return (
    <section>
      <SectionHeader title="AI Keys" />
      <div className="surface-card rounded-3xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground mt-0.5">
            <Bot className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Groq API key</p>
            <p className="text-xs text-muted-foreground mb-3">
              Your own key is used instead of the shared backend key — no rate-limit issues. Get one free at{" "}
              <span className="text-primary">console.groq.com</span>.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={show ? "text" : "password"}
                  value={groqKey}
                  onChange={(e) => setGroqKeyState(e.target.value)}
                  placeholder="gsk_…"
                  className="h-11 rounded-2xl bg-elevated pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide key" : "Show key"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button onClick={save} className="rounded-2xl">Save</Button>
            </div>
            {groqKey && (
              <button
                type="button"
                onClick={() => { setGroqKeyState(""); setGroqKey(""); toast.success("Groq API key cleared"); }}
                className="mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove key
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestNotificationSection() {
  const { subscribed, supported } = usePushNotifications();
  const [sending, setSending] = useState(false);

  async function sendTest() {
    if (!supported || !subscribed) {
      toast.error("Enable notifications first in the section above.");
      return;
    }
    setSending(true);
    try {
      await pushApi.sendTest();
      toast.success("Test notification sent — you should see it now, even if the app is closed.");
    } catch {
      toast.error("Failed to send test notification.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <SectionHeader title="Developer" />
      <div className="surface-card rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground mt-0.5">
            <Bell className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Test notification</p>
            <p className="text-xs text-muted-foreground mb-4">
              Sends a real push notification from the server — works even when the app is closed.
            </p>
            <Button
              onClick={sendTest}
              disabled={sending}
              variant="secondary"
              className="rounded-2xl"
            >
              <Bell className="size-4" />
              {sending ? "Sending…" : "Send test now"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
