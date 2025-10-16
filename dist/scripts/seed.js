"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env.local
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
const seed_db_1 = require("../src/lib/seed-db");
(0, seed_db_1.seedDatabase)().then(() => {
    console.log('Database seeding completed successfully.');
    process.exit(0);
}).catch(error => {
    console.error('Database seeding failed:', error);
    process.exit(1);
});
