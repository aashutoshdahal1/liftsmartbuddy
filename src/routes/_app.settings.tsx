import { createFileRoute } from "@tanstack/react-router";
import { Bell, Bot, BellOff, CreditCard, Eye, EyeOff, Ruler, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getGroqKey, setGroqKey } from "@/lib/api";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { useAppSelector } from "@/store";

function TestNotificationSection() {
  const { subscribed, supported } = usePushNotifications();
  const [countdown, setCountdown] = useState<number | null>(null);

  async function scheduleTest() {
    if (!supported || !subscribed) {
      toast.error("Enable notifications first in the section above.");
      return;
    }
    // Show a local notification via the service worker after 60 seconds
    const reg = await navigator.serviceWorker.ready;
    let secs = 60;
    setCountdown(secs);
    const interval = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(interval);
        setCountdown(null);
        reg.showNotification("Good morning, champ! 💪", {
          body: "This is your LiftSmart test notification. It's working!",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "test-notification",
          // @ts-ignore — vibrate is valid in service worker context
          vibrate: [100, 50, 100],
          data: { url: "/dashboard" },
        });
        toast.success("Test notification sent!");
      }
    }, 1000);
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
              Sends a test push notification to your device after 1 minute. Notifications must be enabled above.
            </p>
            <Button
              onClick={scheduleTest}
              disabled={countdown !== null}
              variant="secondary"
              className="rounded-2xl"
            >
              <Bell className="size-4" />
              {countdown !== null ? `Sending in ${countdown}s…` : "Send test in 1 min"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LiftSmart" },
      {
        name: "description",
        content: "Manage your profile, units, notifications, privacy and subscription in LiftSmart.",
      },
      { property: "og:title", content: "Settings — LiftSmart" },
      { property: "og:description", content: "Profile, units, notifications and subscription." },
    ],
  }),
  component: SettingsPage,
});

function Row({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof User;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function NotificationsSection() {
  const { permission, subscribed, loading, supported, subscribe, unsubscribe } = usePushNotifications();

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
              <ul className="space-y-2 pl-1">
                {[
                  { time: "6:00 AM", label: "Morning motivation", detail: "AI-generated based on your goal & weight trend" },
                  { time: "12:00 PM", label: "Food log reminder", detail: "Only if you haven't logged food yet" },
                  { time: "8:00 PM", label: "Workout reminder", detail: "Only if no workout logged today" },
                  { time: "9:00 PM", label: "Weight log reminder", detail: "Only if weight not logged today" },
                ].map((n) => (
                  <li key={n.time} className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-2.5">
                    <span className="text-xs font-bold text-primary w-16 shrink-0">{n.time}</span>
                    <div>
                      <p className="text-xs font-semibold">{n.label}</p>
                      <p className="text-[10px] text-muted-foreground">{n.detail}</p>
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

function AiKeysSection() {
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

function SettingsPage() {
  const authUser = useAppSelector((s) => s.auth.user);
  const initials = authUser?.name ? authUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  return (
    <AppShell title="Settings" subtitle="Profile, preferences and subscription">
      <div className="max-w-2xl space-y-6">
        <section className="surface-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-border">
              <AvatarFallback className="bg-elevated font-display text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-lg font-semibold">{authUser?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{authUser?.email ?? "—"}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" defaultValue={authUser?.name ?? ""} className="mt-2 h-11 rounded-2xl bg-elevated" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={authUser?.email ?? ""} disabled className="mt-2 h-11 rounded-2xl bg-elevated opacity-60 cursor-not-allowed" />
            </div>
          </div>
          <Button className="mt-5 rounded-2xl" onClick={() => toast.success("Profile saved")}>
            Save changes
          </Button>

          {/* Notifications + AI Keys inline for mobile */}
          <div className="mt-6 space-y-6 lg:hidden">
            <div className="border-t border-border pt-6">
              <NotificationsSection />
            </div>
            <AiKeysSection />
            <TestNotificationSection />
          </div>
        </section>

        <section>
          <SectionHeader title="Preferences" />
          <div className="surface-card divide-y divide-border rounded-3xl">
            <Row icon={Ruler} title="Metric units" desc="Kilograms and centimetres">
              <Switch defaultChecked aria-label="Metric units" />
            </Row>
            <Row icon={Bell} title="Smart notifications" desc="Workout, meal and recovery nudges">
              <Switch defaultChecked aria-label="Smart notifications" />
            </Row>
            <Row icon={ShieldCheck} title="Private profile" desc="Hide your stats from leaderboards">
              <Switch aria-label="Private profile" />
            </Row>
          </div>
        </section>

        <div className="hidden lg:block space-y-6">
          <NotificationsSection />
          <AiKeysSection />
          <TestNotificationSection />
        </div>

        <section>
          <SectionHeader title="Subscription" />
          <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
            <div>
              <p className="font-display text-base font-semibold">LiftSmart Pro</p>
              <p className="mt-1 text-sm text-muted-foreground">$12 / month · renews Aug 28</p>
            </div>
            <Button variant="secondary" className="rounded-2xl">
              <CreditCard className="size-4" />
              Manage billing
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
