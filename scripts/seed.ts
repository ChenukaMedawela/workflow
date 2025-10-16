
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { seedDatabase } from '../src/lib/seed-db';

seedDatabase().then(() => {
  console.log('Database seeding completed successfully.');
  process.exit(0);
}).catch(error => {
  console.error('Database seeding failed:', error);
  process.exit(1);
});
