"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { BulletMascot } from "@/components/bullet-mascot.tsx";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme.tsx";

export function AppHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <BulletMascot className="h-8 w-11" />
          <span className="font-bold">Dhaka Tesla Pool</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={toggle}
            className="rounded-lg border p-1.5 transition hover:border-primary"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user && (
            <>
              <span className="text-muted-foreground">
                {user.name} · {user.role === "DRIVER" ? "Driver" : "Passenger"}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border px-3 py-1.5 font-medium transition hover:border-primary"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
