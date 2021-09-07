---
'@signalwire/core': patch
---

Bugfix on the internal EventEmitter where, in a specific case, the `.off()` method did not remove the listener. Improved test coverage.
