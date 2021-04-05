import * as core from "@signalwire/core";

export const sum = (a: number, b: number) => {
  if ("development" === process.env.NODE_ENV) {
    console.log("Core feature", core.sum(a, b));

    console.log("boop");
  }
  return a + b;
};
