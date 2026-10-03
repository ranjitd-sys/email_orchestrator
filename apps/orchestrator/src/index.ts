const PORT = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "orchestrator" });
    }
    return new Response("email-orchestrator", { status: 200 });
  },
});

console.log(`orchestrator listening on ${server.url}`);