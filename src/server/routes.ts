import { createUser, verifyUser, getRecentMessages } from "../db/database";
import { MediaManager } from "../media";
import { createSession, deleteSession } from "./session";

function serveFile(filePath: string, type: string): Response {
  const file = Bun.file(`${process.cwd()}/src/views/${filePath}`);
  return new Response(file, {
    headers: { "Content-Type": type },
  });
}

export async function handleRequest(
  req: Request,
  server: any,
  user: any
): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
      },
    });
  }

  const url = new URL(req.url);

  // Serve media files
  if (url.pathname.startsWith("/media/")) {
    const filePath = `${process.cwd()}${url.pathname}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  }

  // Add CORS headers helper function
  const addCorsHeaders = (response: Response): Response => {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    headers.set("Access-Control-Allow-Credentials", "true");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  // Static files
  if (url.pathname.startsWith("/public/")) {
    const filePath = `${process.cwd()}${url.pathname}`;
    const file = Bun.file(filePath);
    return addCorsHeaders(new Response(file));
  }

  // WebSocket upgrade
  if (url.pathname === "/ws") {
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const upgraded = server.upgrade(req, { data: { user } });
    // @ts-expect-error ts(2322): Type 'undefined' is not assignable to type 'Response'.
    return upgraded
      ? undefined
      : addCorsHeaders(
          new Response("WebSocket upgrade failed", { status: 400 })
        );
  }

  // Routes
  switch (url.pathname) {
    case "/":
      return addCorsHeaders(serveFile("index.html", "text/html"));

    case "/login":
      if (req.method === "POST") {
        try {
          const { username, password } = await req.json();
          const user = await verifyUser(username, password);

          if (user) {
            const sessionId = await createSession(user);
            return addCorsHeaders(
              new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "Set-Cookie": `sessionId=${sessionId}; HttpOnly; Path=/`,
                },
              })
            );
          }

          return addCorsHeaders(
            new Response(
              JSON.stringify({
                success: false,
                error: "Invalid username or password",
              }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        } catch (error) {
          return addCorsHeaders(
            new Response(
              JSON.stringify({
                success: false,
                error: "Invalid request format",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }
      }
      return addCorsHeaders(serveFile("login.html", "text/html"));

    case "/signup":
      if (req.method === "POST") {
        try {
          const { username, password } = await req.json();
          const user = await createUser(username, password);

          if (user) {
            return addCorsHeaders(
              new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            );
          }

          return addCorsHeaders(
            new Response(
              JSON.stringify({
                success: false,
                error: "Username already exists",
              }),
              {
                status: 409,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        } catch (error) {
          return addCorsHeaders(
            new Response(
              JSON.stringify({
                success: false,
                error: "Invalid request format",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }
      }
      return addCorsHeaders(serveFile("signup.html", "text/html"));

    case "/logout":
      const sessionId = req.headers
        .get("Cookie")
        ?.split(";")
        .find((c) => c.trim().startsWith("sessionId="))
        ?.split("=")[1];

      if (sessionId) {
        await deleteSession(sessionId);
      }

      // Return an HTML page that ensures redirect happens
      const redirectHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=/login">
  <title>Logging out...</title>
</head>
<body>
  <p>Logging out... If you are not redirected, <a href="/login">click here</a>.</p>
  <script>window.location.href = "/login";</script>
</body>
</html>`;

      return addCorsHeaders(
        new Response(redirectHtml, {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            "Set-Cookie":
              "sessionId=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
          },
        })
      );

    case "/me":
      if (!user) {
        return addCorsHeaders(
          new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return addCorsHeaders(
        new Response(JSON.stringify(user), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    case "/messages":
      if (!user) {
        return addCorsHeaders(new Response("Unauthorized", { status: 401 }));
      }
      const messages = await getRecentMessages();
      return addCorsHeaders(
        new Response(JSON.stringify(messages), {
          headers: { "Content-Type": "application/json" },
        })
      );

    case "/upload":
      if (!user) {
        return addCorsHeaders(new Response("Unauthorized", { status: 401 }));
      }
      if (req.method !== "POST") {
        return addCorsHeaders(
          new Response("Method not allowed", { status: 405 })
        );
      }
      try {
        const formData = await req.formData();
        const image = formData.get("image");

        if (!image || !(image instanceof File)) {
          return addCorsHeaders(
            new Response("No image provided", { status: 400 })
          );
        }

        const buffer = await image.arrayBuffer();
        const result = await MediaManager.getInstance().processAndSaveImage(
          Buffer.from(buffer),
          image.name
        );

        return addCorsHeaders(
          new Response(JSON.stringify({ url: result.url }), {
            headers: { "Content-Type": "application/json" },
          })
        );
      } catch (error) {
        console.error("Upload error:", error);
        return addCorsHeaders(
          new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Upload failed",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      }

    default:
      return addCorsHeaders(new Response("Not Found", { status: 404 }));
  }
}
