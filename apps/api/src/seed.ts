import { writeFileSync } from "fs";
import {
  addMembership,
  createMicroTask,
  createOrganization,
  createTask,
  createUser,
  exportSeedData,
  resetStore
} from "./store";

const runSeed = () => {
  resetStore();

  const user = createUser("seed-user@pinky.dev", "Seed User");
  const organization = createOrganization("Pinky Seed Workspace");
  addMembership(user.id, organization.id, "ADMIN");

  const task = createTask(
    organization.id,
    "Onboarding vorbereiten",
    "Checklist für neue Teammitglieder"
  );

  createMicroTask({
    organizationId: organization.id,
    taskId: task.id,
    title: "Willkommenspaket packen",
    description: "Laptop, Zubehör und Goodies vorbereiten",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
  });

  createMicroTask({
    organizationId: organization.id,
    taskId: task.id,
    title: "Zugangsdaten anlegen",
    description: "Accounts für E-Mail und Tools erstellen",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString()
  });

  createMicroTask({
    organizationId: organization.id,
    taskId: task.id,
    title: "Erste Woche planen",
    description: "Meetings und Mentor festlegen",
    dueAt: null
  });

  const seedData = exportSeedData();
  writeFileSync(
    `${process.cwd()}/seed-data.json`,
    JSON.stringify(seedData, null, 2),
    "utf8"
  );
  console.log("Seed data written to seed-data.json");
};

runSeed();
