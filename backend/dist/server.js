"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const leads_routes_1 = __importDefault(require("./routes/leads.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const import_routes_1 = __importDefault(require("./routes/import.routes"));
const deals_routes_1 = __importDefault(require("./routes/deals.routes"));
const campaigns_routes_1 = __importDefault(require("./routes/campaigns.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/auth", auth_routes_1.default);
app.use("/leads", leads_routes_1.default);
app.use("/dashboard", dashboard_routes_1.default);
app.use("/import", import_routes_1.default);
app.use("/deals", deals_routes_1.default);
app.use("/campaigns", campaigns_routes_1.default);
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on http://localhost:${PORT}`);
});
