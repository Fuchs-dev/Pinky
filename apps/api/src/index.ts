import { createApiServer } from "./server";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

const server = createApiServer();

server.listen(port, () => {
  console.log(`Pinky API listening on http://localhost:${port}`);
});
