"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    const password = await bcryptjs_1.default.hash("admin123", 10);
    await prisma_1.prisma.user.upsert({
        where: { email: "admin@crm.local" },
        update: {},
        create: {
            name: "Admin",
            email: "admin@crm.local",
            passwordHash: password,
            role: "admin",
        },
    });
    console.log("Admin user created");
}
main().finally(() => prisma_1.prisma.$disconnect());
