/** Express 5 types route params as string | string[]. Normalize to string. */
export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
