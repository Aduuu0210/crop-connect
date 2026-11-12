import "dotenv/config";
import { seedDatabase } from "./seedData";

seedDatabase()
  .then(() => {
    console.log("Seeded successfully.");
    console.log("Demo accounts (password: password123):");
    console.log("  customer@farmdirect.com · driver@farmdirect.com · farmer@farmdirect.com");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
