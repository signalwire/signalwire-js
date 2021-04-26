const path = require('path')
const commonjs = require('@rollup/plugin-commonjs')
const replace = require('@rollup/plugin-replace')

const external = (id) => !id.startsWith('.') && !path.isAbsolute(id)

exports.createRollupConfig = (
  { swPlugins = {}, swExternal = [], ...config },
  options
) => {
  config.plugins = config.plugins.map((plugin) => {
    if (plugin.name === 'replace') {
      return replace({
        'process.env.NODE_ENV': JSON.stringify(options.env),
        preventAssignment: true,
        ...swPlugins[plugin.name],
      })
    } else if (plugin.name === 'commonjs') {
      return commonjs({
        include: /\/node_modules\//,

        // https://github.com/rollup/plugins/issues/304#issuecomment-619858916
        // exclude: ['node_modules/symbol-observable/es/*.js'],

        ...swPlugins[plugin.name],
      })
    } else if (plugin.name in swPlugins) {
      return swPlugins[plugin.name]
    }

    return plugin
  })

  config.external = (id) => {
    if (id.startsWith('@signalwire') || swExternal.includes(id)) {
      return false
    }

    return external(id)
  }

  if (config.output.format === 'umd') {
    delete config.external
  }

  return config
}
