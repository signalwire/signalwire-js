module.exports = {
  agents: {
    // Maps packages to agent-name. Take into account that
    // these names are just a part within the fully
    // qualified agent sent to the server:
    // @signalwire/<platform>/<sdk-name>/<x.y.x>
    byName: {
      '@signalwire/realtime-api': 'nodejs/realtime-api',
      '@signalwire/js': 'js/browser',
    },
  },
  utilityPackages: ['@signalwire/core', '@signalwire/webrtc'],
}
