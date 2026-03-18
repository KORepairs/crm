import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import leadsRoutes from "./routes/leads.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import importRoutes from "./routes/import.routes";
import dealsRoutes from "./routes/deals.routes";
import campaignsRoutes from "./routes/campaigns.routes";
import { prisma } from "./lib/prisma";



dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/leads", leadsRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/import", importRoutes);
app.use("/deals", dealsRoutes);
app.use("/campaigns", campaignsRoutes);




app.get("/health", (_req, res) => {
  res.json({ ok: true });
});


const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://localhost:${PORT}`);
});
