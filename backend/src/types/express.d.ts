import type { AuthPayload } from "../lib/auth.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export {};
