"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BulletMascot } from "@/components/bullet-mascot.tsx";
import { useAuth } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api.ts";

const DEMO = [
  { label: "Nusrat", email: "nusrat@tesla.pool", role: "Passenger" },
  { label: "Rafiq", email: "rafiq@tesla.pool", role: "Passenger" },
  { label: "Shirin", email: "shirin@tesla.pool", role: "Passenger" },
  { label: "Jashim", email: "jashim@tesla.pool", role: "Driver" },
];

function Wheel({
  size,
  className,
  duration,
  direction = 1,
}: {
  size: number;
  className: string;
  duration: number;
  direction?: number;
}) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className={className}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 * direction }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="7" fill="currentColor" />
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i * Math.PI) / 8;
        return (
          <line
            key={i}
            x1={50 + 7 * Math.cos(a)}
            y1={50 + 7 * Math.sin(a)}
            x2={50 + 44 * Math.cos(a)}
            y2={50 + 44 * Math.sin(a)}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        );
      })}
    </motion.svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { signin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(nextEmail: string) {
    setError(null);
    setLoading(true);
    try {
      const user = await signin(nextEmail, password);
      router.push(user.role === "DRIVER" ? "/driver" : "/rides");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Animated Dhaka-flavoured backdrop: glow, skyline and rickshaw wheels. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 55% at 50% 20%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 60%), radial-gradient(50% 40% at 85% 90%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%)",
          }}
        />
        <Wheel
          size={220}
          duration={60}
          className="absolute -right-12 -top-12 text-primary opacity-[0.07]"
        />
        <Wheel
          size={300}
          duration={90}
          direction={-1}
          className="absolute -bottom-20 -left-20 text-accent opacity-[0.06]"
        />
        <svg
          viewBox="0 0 1440 320"
          className="absolute bottom-0 left-0 w-full text-foreground"
          preserveAspectRatio="xMidYMax slice"
          style={{ opacity: 0.06 }}
        >
          <g fill="currentColor">
            <rect x="60" y="180" width="70" height="140" />
            <rect x="150" y="120" width="60" height="200" />
            <rect x="230" y="200" width="90" height="120" />
            <rect x="340" y="90" width="55" height="230" />
            <rect x="420" y="160" width="80" height="160" />
            <rect x="520" y="130" width="60" height="190" />
            <rect x="600" y="210" width="100" height="110" />
            <rect x="720" y="100" width="65" height="220" />
            <rect x="810" y="170" width="85" height="150" />
            <rect x="915" y="140" width="60" height="180" />
            <rect x="995" y="200" width="95" height="120" />
            <rect x="1110" y="110" width="60" height="210" />
            <rect x="1190" y="175" width="85" height="145" />
            <rect x="1295" y="150" width="70" height="170" />
          </g>
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <BulletMascot className="h-24 w-32" />
          </motion.div>
          <h1 className="mt-3 text-2xl font-bold">Dhaka Tesla Pool</h1>
          <p className="text-sm text-muted-foreground">
            Share a seat. Split the fare. Survive Dhaka traffic.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => submit(email)}
            disabled={loading || !email}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}

        <div className="mt-6">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            Quick demo login (password: password123)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => submit(d.email)}
                disabled={loading}
                className="rounded-lg border bg-muted px-3 py-2 text-xs font-medium transition hover:border-primary disabled:opacity-50"
              >
                <span className="block font-semibold">{d.label}</span>
                <span className="text-muted-foreground">{d.role}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
