import type { Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@dtp/shared";
import { env } from "../config/env.ts";

const COOKIE_NAME = "dtp_token";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export type AuthPayload = {
  userId: string;
  role: UserRole;
};

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string") {
    throw new Error("Unexpected token payload");
  }
  return { userId: decoded.userId as string, role: decoded.role as UserRole };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export { COOKIE_NAME };
