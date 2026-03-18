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

app.get("/seed", async (_req, res) => {
  try {
    const bcrypt = await import("bcryptjs");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const admin = await prisma.user.upsert({
      where: { email: "admin@crm.local" },
      update: {},
      create: {
        name: "Admin",
        email: "admin@crm.local",
        passwordHash: hashedPassword,
        role: "admin",
      },
    });

    const sales = await prisma.user.upsert({
      where: { email: "sales@crm.local" },
      update: {},
      create: {
        name: "Sales User",
        email: "sales@crm.local",
        passwordHash: hashedPassword,
        role: "sales",
      },
    });

    res.json({
      message: "Seeded users",
      users: [admin.email, sales.email],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Seed failed", error: String(err) });
  }
});

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://localhost:${PORT}`);
});
