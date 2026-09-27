import type { RequestHandler } from "express";
import type { UserRole } from "@dtp/shared";
import { COOKIE_NAME, verifyToken } from "../lib/auth.ts";
import { forbidden, unauthorized } from "../lib/errors.ts";

// Adds the authenticated user to req.user, or throws 401.
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    throw unauthorized();
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw unauthorized("Invalid or expired session", "INVALID_SESSION");
  }
};

// Must run after authenticate. Rejects users whose role is not allowed.
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      throw unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw forbidden("You do not have access to this resource");
    }
    next();
  };
