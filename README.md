# Chatter

A real-time chat application built with Bun, WebSocket, SQLite, and TailwindCSS.

## Features

- 🔐 User authentication (signup/login)
- 💬 Real-time messaging with WebSocket
- ✍️ Markdown support for messages
- 📝 Typing indicators
- 🌓 Dark mode support
- 🔄 Auto-scroll with smart scroll lock
- 📱 Responsive design

## Prerequisites

- [Bun](https://bun.sh) v1.1.36 or higher

## Installation

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

## Development

Run the development server with auto-reload:

```bash
bun run dev
```

Watch and compile CSS:

```bash
bun run css:watch
```

## Production

Build for production:

```bash
bun run build
```

Start the production server:

```bash
bun run start
```

### PM2 Deployment

The project includes PM2 scripts for production deployment:

```bash
bun run pm2-start    # Start with PM2
bun run pm2-stop     # Stop PM2 service
bun run pm2-restart  # Restart PM2 service
bun run pm2-startup  # Configure PM2 startup on boot
```

## Project Structure

- `/src`
  - `/db` - Database schema and operations
  - `/views` - HTML templates
- `/public`
  - `/css` - Stylesheets (TailwindCSS)
  - `/pages` - Client-side JavaScript
  - `/images` - Static assets

## Technologies

- **Runtime**: [Bun](https://bun.sh)
- **Database**: SQLite
- **Styling**: TailwindCSS with Typography plugin
- **Frontend**: Vanilla JavaScript with WebSocket
- **Security**: bcryptjs for password hashing

## Environment Variables

- `PORT` - Server port (default: 5177)
- `SCHEMA_PATH` - Path to SQLite schema file
