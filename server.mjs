import http from "node:http";
import next from "next";
import { handleBackendRequest } from "./backend/server.mjs";

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "localhost";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${hostname}:${port}`}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (
    pathname === "/health" ||
    pathname === "/me" ||
    pathname === "/inbox" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/work-orders") ||
    pathname.startsWith("/product-orders")
  ) {
    return handleBackendRequest(req, res);
  }

  return handle(req, res, url);
});

server.listen(port, hostname, () => {
  console.log(`Capco app running at http://${hostname}:${port}`);
});
