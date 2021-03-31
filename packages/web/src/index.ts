import * as core from "@signalwire/core";
import * as webrtc from "@signalwire/webrtc";

export const sum = (a: number, b: number) => {
  if ("development" === process.env.NODE_ENV) {
    console.log("Core feature", core.sum(a, b));
    console.log("WebRTC feature", webrtc.sum(a, b));
  }

  return a + b;
};
