export const isEmptyArray = (a?: unknown[]): boolean => {
  return (a?.length ?? 0) === 0;
};
