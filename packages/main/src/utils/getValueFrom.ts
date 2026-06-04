export const getValueFrom = <T = unknown>(
  obj: unknown,
  path: string,
  defaultValue?: T
): T | undefined => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }
  return (result === undefined ? defaultValue : result) as T;
};
