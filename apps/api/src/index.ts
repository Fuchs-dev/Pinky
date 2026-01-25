import { createServer } from "http";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    const payload = JSON.stringify({ status: "ok" });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    });
    response.end(payload);
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(port, () => {
  console.log(`Pinky API listening on http://localhost:${port}`);
});
