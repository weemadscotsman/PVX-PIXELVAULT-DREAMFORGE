/**
 * Generate random ID for entities
 */
export function createId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}