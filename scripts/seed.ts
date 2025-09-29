
// scripts/seed.ts
import { seedDatabase } from '@/lib/seed-db';

// This is an async IIFE (Immediately Invoked Function Expression)
(async () => {
  try {
    await seedDatabase();
    console.log("Script finished.");
    // Force the script to exit successfully
    process.exit(0);
  } catch (error) {
    console.error("An error occurred during script execution: ", error);
    // Force the script to exit with an error code
    process.exit(1);
  }
})();
