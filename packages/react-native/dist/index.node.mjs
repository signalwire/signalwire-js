// src/index.ts
import { uuid, getLogger } from "@signalwire/core";
import * as webrtc from "@signalwire/webrtc";
var sum = (a, b) => {
  if (process.env.NODE_ENV === "development") {
    getLogger().info("Core feature", uuid());
    getLogger().info("WebRTC feature", webrtc);
  }
  return a + b;
};
export {
  sum
};
//# sourceMappingURL=index.node.mjs.map
