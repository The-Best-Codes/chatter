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
  timestamp: string
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
            new Date(timestamp).getTime() + 1
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
            })
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

// Queue for processing AI messages
const aiMessageQueue = new Map<string, (response: string) => void>();
let aiMessageCounter = 0;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  username?: string;
}

const MAX_CONTEXT_LENGTH = 20;
const userContexts = new Map<string, ChatMessage[]>();

function addMessageToContext(username: string, message: ChatMessage) {
  if (!userContexts.has(username)) {
    userContexts.set(username, []);
  }

  const context = userContexts.get(username)!;
  context.push(message);

  // Keep only the last MAX_CONTEXT_LENGTH messages
  if (context.length > MAX_CONTEXT_LENGTH) {
    context.shift();
  }
}

async function processAIMessage(
  prompt: string,
  username: string
): Promise<string> {
  try {
    // Get or create context for this user
    const context = userContexts.get(username) || [];

    // Add the new message to context
    addMessageToContext(username, {
      role: "user",
      content: prompt,
      username,
    });

    const response = await fetch(
      `https://api.shuttleai.com/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "shuttleai/shuttle-3",
          messages: [
            // System message to provide context about the chat
            {
              role: "system",
              content: `You are a helpful chat bot. Remember to address users by their username when appropriate. The user's username is ${username}.`,
            },
            ...context,
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error:", response.status, errorData);
      throw new Error(`API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      console.error("Unexpected API response:", data);
      throw new Error("Invalid API response format");
    }

    const aiResponse = data.choices[0].message.content;

    // Add AI's response to context
    addMessageToContext(username, {
      role: "assistant",
      content: aiResponse,
    });

    return aiResponse;
  } catch (error: any) {
    console.error("Error processing AI message:", error);
    return `Sorry, I encountered an error processing your request. ${error.message}`;
  }
}

export const aiBot: Bot = {
  name: "AIBot",
  patterns: [
    {
      regex: /^!ai (.+)$/i,
      response: (match, username) => {
        const messageId = `ai_${aiMessageCounter++}`;
        const prompt = match[1];

        // Start processing the AI response with username context
        processAIMessage(prompt, username).then((aiResponse) => {
          const botTimestamp = new Date().toISOString();

          // Save and broadcast the AI response
          createMessage(aiResponse, {
            isBot: true,
            botName: "AIBot",
            timestamp: botTimestamp,
          }).then(() => {
            serverInstance.publish(
              "chat",
              JSON.stringify({
                type: "message",
                username: "AIBot",
                content: aiResponse,
                timestamp: botTimestamp,
                isBot: true,
              })
            );
          });
        });

        // Return a temporary message
        return "🤔 Let me think about that...";
      },
    },
  ],
};
