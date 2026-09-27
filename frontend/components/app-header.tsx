"use client";

import { useRouter } from "next/navigation";
import { BulletMascot } from "@/components/bullet-mascot.tsx";
import { useAuth } from "@/lib/auth";

export function AppHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

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
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {user.name} · {user.role === "DRIVER" ? "Driver" : "Passenger"}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border px-3 py-1.5 font-medium transition hover:border-primary"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
