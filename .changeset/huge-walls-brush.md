---
'@signalwire/core': patch
---

Fix: Authentication errors (-32002) during signalwire.connect now correctly disconnect the client without retrying. Transient server errors during connect now trigger a reconnect instead of being misreported as auth failures. Fixed a hang when calling disconnect() after an auth error.