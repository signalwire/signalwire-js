---
'@signalwire/js': patch
---

Only emits self member updates with the original self.member_id. That is to prevent the application to be exposed to internal self member versions on each call segment.
