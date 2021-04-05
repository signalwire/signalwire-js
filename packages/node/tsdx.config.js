const { createRollupConfig } = require("../../tsdx.base");

module.exports = {
  rollup(config, options) {
    return createRollupConfig(config, options);
  },
};
