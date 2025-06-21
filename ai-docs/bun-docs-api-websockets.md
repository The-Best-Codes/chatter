Title: WebSockets – API | Bun Docs

URL Source: https://bun.sh/docs/api/websockets

Markdown Content:
`Bun.serve()` supports server-side WebSockets, with on-the-fly compression, TLS support, and a Bun-native publish-subscribe API.

**⚡️ 7x more throughput** — Bun's WebSockets are fast. For a [simple chatroom](https://github.com/oven-sh/bun/tree/main/bench/websocket-server/README.md) on Linux x64, Bun can handle 7x more requests per second than Node.js + [`"ws"`](https://github.com/websockets/ws).

| Messages sent per second | Runtime | Clients |
| --- | --- | --- |
| ~700,000 | (`Bun.serve`) Bun v0.2.1 (x64) | 16 |
| ~100,000 | (`ws`) Node v18.10.0 (x64) | 16 |

Internally Bun's WebSocket implementation is built on [uWebSockets](https://github.com/uNetworking/uWebSockets).

[Start a WebSocket server](https://bun.sh/docs/api/websockets#start-a-websocket-server)
---------------------------------------------------------------------------------------

Below is a simple WebSocket server built with `Bun.serve`, in which all incoming requests are [upgraded](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism) to WebSocket connections in the `fetch` handler. The socket handlers are declared in the `websocket` parameter.

```
Bun.serve({
  fetch(req, server) {
    // upgrade the request to a WebSocket
    if (server.upgrade(req)) {
      return; // do not return a Response
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {}, // handlers
});
```

The following WebSocket event handlers are supported:

```
Bun.serve({
  fetch(req, server) {}, // upgrade logic
  websocket: {
    message(ws, message) {}, // a message is received
    open(ws) {}, // a socket is opened
    close(ws, code, message) {}, // a socket is closed
    drain(ws) {}, // the socket is ready to receive more data
  },
});
```

An API designed for speed

The first argument to each handler is the instance of `ServerWebSocket` handling the event. The `ServerWebSocket` class is a fast, Bun-native implementation of [`WebSocket`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) with some additional features.

```
Bun.serve({
  fetch(req, server) {}, // upgrade logic
  websocket: {
    message(ws, message) {
      ws.send(message); // echo back the message
    },
  },
});
```

### [Sending messages](https://bun.sh/docs/api/websockets#sending-messages)

Each `ServerWebSocket` instance has a `.send()` method for sending messages to the client. It supports a range of input types.

```
ws.send("Hello world"); // string
ws.send(response.arrayBuffer()); // ArrayBuffer
ws.send(new Uint8Array([1, 2, 3])); // TypedArray | DataView
```

Once the upgrade succeeds, Bun will send a `101 Switching Protocols` response per the [spec](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism). Additional `headers` can be attached to this `Response` in the call to `server.upgrade()`.

```
Bun.serve({
  fetch(req, server) {
    const sessionId = await generateSessionId();
    server.upgrade(req, {
      headers: {
        "Set-Cookie": `SessionId=${sessionId}`,
      },
    });
  },
  websocket: {}, // handlers
});
```

### [Contextual data](https://bun.sh/docs/api/websockets#contextual-data)

Contextual `data` can be attached to a new WebSocket in the `.upgrade()` call. This data is made available on the `ws.data` property inside the WebSocket handlers.

```
type WebSocketData = {
  createdAt: number;
  channelId: string;
  authToken: string;
};

// TypeScript: specify the type of `data`
Bun.serve<WebSocketData>({
  fetch(req, server) {
    const cookies = new Bun.CookieMap(req.headers.get("cookie")!);

    server.upgrade(req, {
      // this object must conform to WebSocketData
      data: {
        createdAt: Date.now(),
        channelId: new URL(req.url).searchParams.get("channelId"),
        authToken: cookies.get("X-Token"),
      },
    });

    return undefined;
  },
  websocket: {
    // handler called when a message is received
    async message(ws, message) {
      const user = getUserFromToken(ws.data.authToken);

      await saveMessageToDatabase({
        channel: ws.data.channelId,
        message: String(message),
        userId: user.id,
      });
    },
  },
});
```

To connect to this server from the browser, create a new `WebSocket`.

browser.js

```
const socket = new WebSocket("ws://localhost:3000/chat");

socket.addEventListener("message", event => {
  console.log(event.data);
})
```

**Identifying users** —The cookies that are currently set on the page will be sent with the WebSocket upgrade request and available on `req.headers` in the `fetch` handler. Parse these cookies to determine the identity of the connecting user and set the value of `data` accordingly.

### [Pub/Sub](https://bun.sh/docs/api/websockets#pub-sub)

Bun's `ServerWebSocket` implementation implements a native publish-subscribe API for topic-based broadcasting. Individual sockets can `.subscribe()` to a topic (specified with a string identifier) and `.publish()` messages to all other subscribers to that topic (excluding itself). This topic-based broadcast API is similar to [MQTT](https://en.wikipedia.org/wiki/MQTT) and [Redis Pub/Sub](https://redis.io/topics/pubsub).

```
const server = Bun.serve<{ username: string }>({
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      console.log(`upgrade!`);
      const username = getUsernameFromReq(req);
      const success = server.upgrade(req, { data: { username } });
      return success
        ? undefined
        : new Response("WebSocket upgrade error", { status: 400 });
    }

    return new Response("Hello world");
  },
  websocket: {
    open(ws) {
      const msg = `${ws.data.username} has entered the chat`;
      ws.subscribe("the-group-chat");
      server.publish("the-group-chat", msg);
    },
    message(ws, message) {
      // this is a group chat
      // so the server re-broadcasts incoming message to everyone
      server.publish("the-group-chat", `${ws.data.username}: ${message}`);
    },
    close(ws) {
      const msg = `${ws.data.username} has left the chat`;
      ws.unsubscribe("the-group-chat");
      server.publish("the-group-chat", msg);
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
```

Calling `.publish(data)` will send the message to all subscribers of a topic _except_ the socket that called `.publish()`. To send a message to all subscribers of a topic, use the `.publish()` method on the `Server` instance.

```
const server = Bun.serve({
  websocket: {
    // ...
  },
});

// listen for some external event
server.publish("the-group-chat", "Hello world");
```

### [Compression](https://bun.sh/docs/api/websockets#compression)

Per-message [compression](https://websockets.readthedocs.io/en/stable/topics/compression.html) can be enabled with the `perMessageDeflate` parameter.

```
Bun.serve({
  fetch(req, server) {}, // upgrade logic
  websocket: {
    // enable compression and decompression
    perMessageDeflate: true,
  },
});
```

Compression can be enabled for individual messages by passing a `boolean` as the second argument to `.send()`.

```
ws.send("Hello world", true);
```

For fine-grained control over compression characteristics, refer to the [Reference](https://bun.sh/docs/api/websockets#reference).

### [Backpressure](https://bun.sh/docs/api/websockets#backpressure)

The `.send(message)` method of `ServerWebSocket` returns a `number` indicating the result of the operation.

*   `-1` — The message was enqueued but there is backpressure
*   `0` — The message was dropped due to a connection issue
*   `1+` — The number of bytes sent

This gives you better control over backpressure in your server.

### [Timeouts and limits](https://bun.sh/docs/api/websockets#timeouts-and-limits)

By default, Bun will close a WebSocket connection if it is idle for 120 seconds. This can be configured with the `idleTimeout` parameter.

```
Bun.serve({
  fetch(req, server) {}, // upgrade logic
  websocket: {
    idleTimeout: 60, // 60 seconds

    // ...
  },
});
```

Bun will also close a WebSocket connection if it receives a message that is larger than 16 MB. This can be configured with the `maxPayloadLength` parameter.

```
Bun.serve({
  fetch(req, server) {}, // upgrade logic
  websocket: {
    maxPayloadLength: 1024 * 1024, // 1 MB

    // ...
  },
});
```

[Connect to a `Websocket` server](https://bun.sh/docs/api/websockets#connect-to-a-websocket-server)
---------------------------------------------------------------------------------------------------

Bun implements the `WebSocket` class. To create a WebSocket client that connects to a `ws://` or `wss://` server, create an instance of `WebSocket`, as you would in the browser.

```
const socket = new WebSocket("ws://localhost:3000");
```

In browsers, the cookies that are currently set on the page will be sent with the WebSocket upgrade request. This is a standard feature of the `WebSocket` API.

For convenience, Bun lets you setting custom headers directly in the constructor. This is a Bun-specific extension of the `WebSocket` standard. _This will not work in browsers._

```
const socket = new WebSocket("ws://localhost:3000", {
  headers: {
    // custom headers
  },
});
```

To add event listeners to the socket:

```
// message is received
socket.addEventListener("message", event => {});

// socket opened
socket.addEventListener("open", event => {});

// socket closed
socket.addEventListener("close", event => {});

// error handler
socket.addEventListener("error", event => {});
```

[Reference](https://bun.sh/docs/api/websockets#reference)
---------------------------------------------------------

```
namespace Bun {
  export function serve(params: {
    fetch: (req: Request, server: Server) => Response | Promise<Response>;
    websocket?: {
      message: (
        ws: ServerWebSocket,
        message: string | ArrayBuffer | Uint8Array,
      ) => void;
      open?: (ws: ServerWebSocket) => void;
      close?: (ws: ServerWebSocket, code: number, reason: string) => void;
      error?: (ws: ServerWebSocket, error: Error) => void;
      drain?: (ws: ServerWebSocket) => void;

      maxPayloadLength?: number; // default: 16 * 1024 * 1024 = 16 MB
      idleTimeout?: number; // default: 120 (seconds)
      backpressureLimit?: number; // default: 1024 * 1024 = 1 MB
      closeOnBackpressureLimit?: boolean; // default: false
      sendPings?: boolean; // default: true
      publishToSelf?: boolean; // default: false

      perMessageDeflate?:
        | boolean
        | {
            compress?: boolean | Compressor;
            decompress?: boolean | Compressor;
          };
    };
  }): Server;
}

type Compressor =
  | `"disable"`
  | `"shared"`
  | `"dedicated"`
  | `"3KB"`
  | `"4KB"`
  | `"8KB"`
  | `"16KB"`
  | `"32KB"`
  | `"64KB"`
  | `"128KB"`
  | `"256KB"`;

interface Server {
  pendingWebSockets: number;
  publish(
    topic: string,
    data: string | ArrayBufferView | ArrayBuffer,
    compress?: boolean,
  ): number;
  upgrade(
    req: Request,
    options?: {
      headers?: HeadersInit;
      data?: any;
    },
  ): boolean;
}

interface ServerWebSocket {
  readonly data: any;
  readonly readyState: number;
  readonly remoteAddress: string;
  send(message: string | ArrayBuffer | Uint8Array, compress?: boolean): number;
  close(code?: number, reason?: string): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, message: string | ArrayBuffer | Uint8Array): void;
  isSubscribed(topic: string): boolean;
  cork(cb: (ws: ServerWebSocket) => void): void;
}
```
