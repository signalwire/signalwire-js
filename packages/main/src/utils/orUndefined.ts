export function orUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}
