import {
  addMembership,
  createMicroTask,
  createOrganization,
  createTask,
  createUser,
  assignMicroTask,
  completeMicroTask,
  createTaskOffer,
  acceptTaskOffer
} from "./store";
import { db } from "./db/index";
import { taskOffers, microTasks, tasks, memberships, organizations, users, queueIntents } from "./db/schema";

const clearDB = async () => {
  // Clear the tables in reverse dependency order
  await db.delete(queueIntents);
  await db.delete(taskOffers);
  await db.delete(microTasks);
  await db.delete(tasks);
  await db.delete(memberships);
  await db.delete(organizations);
  await db.delete(users);
};

const runSeed = async () => {
  try {
    console.log("Clearing existing DB...");
    await clearDB();

    console.log("Seeding Database...");
    const user = await createUser("seed-user@pinky.dev", "Seed User");
    const organization = await createOrganization("Pinky Seed Workspace");
    await addMembership(user.id, organization.id, "ADMIN");

    const task = await createTask(
      organization.id,
      "Onboarding vorbereiten",
      "Checklist für neue Teammitglieder"
    );

    await createMicroTask({
      organizationId: organization.id,
      taskId: task.id,
      title: "Willkommenspaket packen",
      description_how: "Laptop, Zubehör und Goodies vorbereiten",
      location: "Büro (München)",
      contactPerson: "HR-Abteilung",
      estimatedDuration: "ca. 30 Minuten",
      attachments: "https://intranet.pinky.dev/onboarding/paket-checkliste",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    });

    await createMicroTask({
      organizationId: organization.id,
      taskId: task.id,
      title: "Zugangsdaten anlegen",
      description_how: "Accounts für E-Mail und Tools erstellen",
      location: "Remote",
      contactPerson: "IT-Support",
      estimatedDuration: "ca. 1 Stunde",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString()
    });

    const micro3 = await createMicroTask({
      organizationId: organization.id,
      taskId: task.id,
      title: "Erste Woche planen",
      description_how: "Meetings und Mentor festlegen",
      dueAt: null
    });

    const micro4 = await createMicroTask({
      organizationId: organization.id,
      taskId: task.id,
      title: "Team-Mittagessen buchen",
      description_how: "Tisch für 6 Personen reservieren",
      dueAt: null
    });

    // Assign and complete micro3
    await assignMicroTask(micro3.id, user.id);
    await completeMicroTask(micro3.id, user.id);

    // Offer micro4 and accept it
    await createTaskOffer(micro4.id, user.id);
    await acceptTaskOffer(micro4.id, user.id);

    console.log("Database seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding the database:", err);
    process.exit(1);
  }
};

runSeed();
