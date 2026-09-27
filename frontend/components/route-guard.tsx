"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "@dtp/shared";
import { useAuth } from "@/lib/auth";

export function RouteGuard({ role, children }: { role: UserRole; children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== role) {
      router.replace(user.role === "DRIVER" ? "/driver" : "/rides");
    }
  }, [user, loading, role, router]);

  if (loading || !user || user.role !== role) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return <>{children}</>;
}
