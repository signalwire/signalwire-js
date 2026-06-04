export function fromSecToMs(seconds: number): number {
  return seconds * 1000;
}

export function fromMsToSec(milliseconds: number): number {
  return Math.round(milliseconds / 100) / 10;
}
