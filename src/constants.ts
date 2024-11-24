export const LIMITS = {
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MAX_LENGTH: 128,
  MESSAGE_MAX_LENGTH: 2000,
} as const;

export function validateInput(input: string, maxLength: number): string {
  if (!input || typeof input !== "string") {
    throw new Error("Invalid input");
  }
  if (input.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }
  return input.trim();
}
