import { readFileSync } from "fs";
import { createApiServer } from "./server";
import { loadSeedData, SeedData } from "./store";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

try {
  const rawSeed = readFileSync(`${process.cwd()}/seed-data.json`, "utf8");
  const seedData = JSON.parse(rawSeed) as SeedData;
  loadSeedData(seedData);
  console.log("Loaded seed data from seed-data.json");
} catch {
  // Ignore missing seed file in dev.
}

const server = createApiServer();

server.listen(port, () => {
  console.log(`Pinky API listening on http://localhost:${port}`);
});
