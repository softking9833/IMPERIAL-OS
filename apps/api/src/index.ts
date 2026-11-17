import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { readinessRouter } from "./routes/readiness.js";
import { adminRouter } from "./routes/admin.js";
import { fieldRouter } from "./routes/field.js";
import { learnRouter } from "./routes/learn.js";
import { performanceRouter } from "./routes/performance.js";
import { homeRouter } from "./routes/home.js";
import { profileRouter } from "./routes/profile.js";
import { roleplayRouter } from "./routes/roleplay.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "imperial-os-api",
    milestone: "mobile",
  });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/campaigns", campaignsRouter);
app.use("/readiness", readinessRouter);
app.use("/admin", adminRouter);
app.use("/field", fieldRouter);
app.use("/learn", learnRouter);
app.use("/performance", performanceRouter);
app.use("/home", homeRouter);
app.use("/profile", profileRouter);
app.use("/roleplay", roleplayRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`IMPERIAL OS API listening on http://0.0.0.0:${port}`);
});
