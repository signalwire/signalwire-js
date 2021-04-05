const { createRollupConfig } = require("../../tsdx.base");

/**
 * List of dependencies to be included with @signalwire/core when
 * building the final bundle
 */
const INLINED_DEPS = ["loglevel", "uuid"];

module.exports = {
  rollup(config, options) {
    return createRollupConfig(
      {
        ...config,
        swExternal: INLINED_DEPS,
      },
      options
    );
  },
};
