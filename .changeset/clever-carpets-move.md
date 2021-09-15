---
'@signalwire/js': patch
'@signalwire/realtime-api': patch
---

Split event handlers for member from member updated events so each type of event gets the proper instance as a handler param.
