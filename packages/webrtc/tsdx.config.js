const resolve = require("@rollup/plugin-node-resolve");
const replace = require("@rollup/plugin-replace");

module.exports = {
  rollup(config, options) {
    config.plugins = config.plugins.map((plugin) => {
      if (plugin.name === "replace") {
        return replace({
          "process.env.NODE_ENV": JSON.stringify(options.env),
          preventAssignment: true,
        });
      }

      return plugin;
    });

    config.external = (id) => {
      if (id.startsWith("@signalwire")) {
        return false;
      }

      return true;
    };

    return config;
  },
};
