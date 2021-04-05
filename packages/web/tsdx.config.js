const { createRollupConfig } = require("../../tsdx.base");

/**
 * List of dependencies to be included with @signalwire/core when
 * building the final bundle
 */
const INLINED_DEPS = ["regenerator-runtime"];

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
