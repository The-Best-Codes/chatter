/**
 * Helper functions for working with SQLite database results
 */

// Type assertion helper for single row results
export function typedRow<T>(row: unknown): T | undefined {
  return row as T | undefined;
}

// Type assertion helper for multiple row results
export function typedRows<T>(rows: unknown[]): T[] {
  return rows as T[];
}

// Helper for count queries
export function getCount(result: unknown): number {
  return (result as { count: number })?.count || 0;
}