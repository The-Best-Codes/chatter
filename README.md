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

## Installation

1. Go to the [Releases](https://github.com/The-Best-Codes/chatter/releases/latest) page and download the appropriate file for your system:

### Windows

- Download `windows-modern.zip` (or `windows-base.zip` for older CPUs)
- Right-click and extract the ZIP file
- Double-click the executable to start (or run it from the command line with `./chatter.exe`)
- Open `http://localhost:5177` in your browser

### macOS (Darwin)

- Download `darwin-modern.zip` (or `darwin-base.zip` for older CPUs)
- Extract the ZIP file
- Make the file executable and run it:
  ```bash
  chmod +x ./chatter && ./chatter
  ```
- Open `http://localhost:5177` in your browser

### Linux

- Download `linux-modern.tar.xz` (or `linux-base.tar.xz`)
- Extract the archive
- Make the file executable and run it:
  ```bash
  chmod +x ./chatter && ./chatter
  ```
- Open `http://localhost:5177` in your browser

## Development

If you want to develop or modify the application, follow these steps:

### Prerequisites

- [Bun](https://bun.sh) v1.1.36 or higher

### Setup

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

### Development Server

Run the development server with auto-reload:

```bash
bun run dev
```

Watch and compile CSS:

```bash
bun run css:watch
```

### Using Daytona for Development

Daytona simplifies the setup of development environments. Follow the steps below to set up Chatter using Daytona:

1. **Install Daytona**: Follow the [Daytona installation guide](https://www.daytona.io/docs/installation/installation/).
2. **Create the Workspace**:
   ```bash
   daytona create https://github.com/The-Best-Codes/chatter
   ```
3. **Start the Application**:
   ```bash
   bun run dev
   ```

---

## Production Build

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

## Attributions

- [Bun](https://bun.sh)
- [TailwindCSS](https://tailwindcss.com/)
- [Markdown Renderer](https://marked.js.org/)
- [Chat Sound Effect by Universfield | 'New Notification #7'](https://pixabay.com/collections/interface-sounds-23710620/)
