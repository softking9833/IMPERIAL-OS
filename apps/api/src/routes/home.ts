import { Router } from "express";
import { buildHome } from "../lib/home.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const homeRouter = Router();
homeRouter.use(requireAuth);

homeRouter.get("/", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  const home = await buildHome(req.user.id);
  return res.json({ home });
});
