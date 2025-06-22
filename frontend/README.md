# Chatter Frontend

A secure, end-to-end encrypted messaging application built with React, TypeScript, and Tailwind CSS.

## Features

- End-to-end encryption for secure messaging
- Real-time updates via WebSocket
- User authentication and session management
- Responsive design for all screen sizes

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

### Building for Production

Build the application for production:

```bash
npm run build
```

### Type Checking

Run TypeScript type checking:

```bash
npm run typecheck
```

## Project Structure

- `src/components`: Reusable UI components
- `src/pages`: Page components
- `src/hooks`: Custom React hooks
- `src/stores`: Zustand stores
- `src/services`: API and WebSocket services
- `src/utils`: Utility functions
- `src/types`: TypeScript type definitions
- `src/crypto`: E2EE implementation

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_API_URL=/api
VITE_WS_URL=/ws
```
