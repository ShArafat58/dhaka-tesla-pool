import { Router } from "express";
import { clearAuthCookie, setAuthCookie, signToken } from "../lib/auth.ts";
import { unauthorized } from "../lib/errors.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import { signinSchema, signupSchema } from "../schemas/auth.ts";
import type { SigninInput, SignupInput } from "../schemas/auth.ts";
import { getUserById, registerUser, verifyCredentials } from "../services/auth-service.ts";

export const authRouter = Router();

authRouter.post("/signup", validate({ body: signupSchema }), async (req, res) => {
  const user = await registerUser(req.body as SignupInput);
  setAuthCookie(res, signToken({ userId: user.id, role: user.role }));
  res.status(201).json({ user });
});

authRouter.post("/signin", validate({ body: signinSchema }), async (req, res) => {
  const user = await verifyCredentials(req.body as SigninInput);
  setAuthCookie(res, signToken({ userId: user.id, role: user.role }));
  res.json({ user });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", authenticate, async (req, res) => {
  const user = req.user ? await getUserById(req.user.userId) : null;
  if (!user) {
    throw unauthorized();
  }
  res.json({ user });
});
