import { uuid, logger } from "@signalwire/core";

export const sum = (a: number, b: number) => {
  if ("development" === process.env.NODE_ENV) {
    logger.info("Core feature", uuid());
  }

  return a + b;
};
