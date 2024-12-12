import type { Server } from "bun";
import { type User } from "../db/database";
import { createMessage } from "../db/database";

interface Bot {
  name: string;
  patterns: {
    regex: RegExp;
    response: (match: RegExpMatchArray, username: string) => string;
  }[];
}

const bots: Bot[] = [];
let serverInstance: Server;

export function initBots(server: Server) {
  serverInstance = server;
}

export function registerBot(bot: Bot) {
  bots.push(bot);
}

export async function handleMessage(
  content: string,
  user: User,
  timestamp: string,
) {
  // Skip processing messages from bots to prevent infinite loops
  if ("isBot" in user && user.isBot) {
    return;
  }

  for (const bot of bots) {
    for (const pattern of bot.patterns) {
      const match = content.match(pattern.regex);
      if (match) {
        const response = pattern.response(match, user.username);
        if (response) {
          // Add 1ms to timestamp to ensure it comes after user message
          const botTimestamp = new Date(
            new Date(timestamp).getTime() + 1,
          ).toISOString();

          // Save bot's message to database
          await createMessage(response, {
            isBot: true,
            botName: bot.name,
            timestamp: botTimestamp,
          });

          // Broadcast bot's response
          serverInstance.publish(
            "chat",
            JSON.stringify({
              type: "message",
              username: bot.name,
              content: response,
              timestamp: botTimestamp,
              isBot: true,
            }),
          );
        }
      }
    }
  }
}

// Example bot
export const echoBot: Bot = {
  name: "EchoBot",
  patterns: [
    {
      regex: /^!echo (.+)$/i,
      response: (match) => match[1],
    },
  ],
};

// Example time bot
export const timeBot: Bot = {
  name: "TimeBot",
  patterns: [
    {
      regex: /^!time$/i,
      response: () => `Current time is ${new Date().toLocaleTimeString()}`,
    },
  ],
};

// Example greeting bot
export const greetBot: Bot = {
  name: "GreetBot",
  patterns: [
    {
      regex: /^!hello$/i,
      response: (_, username) => `👋 Hello ${username}!`,
    },
  ],
};
