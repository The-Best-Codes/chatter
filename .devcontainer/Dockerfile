# Use the official Bun image as base
FROM oven/bun:latest as base

# Set the working directory
WORKDIR /app

# Copy package and lock files first
COPY package*.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .

# Set the user to vscode for permissions
USER vscode

# Default command
CMD ["bun", "run", "dev"]
