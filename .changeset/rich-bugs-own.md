---
'@sw-internal/e2e-js': patch
---

Fix conversation spec by making sure promise doesn't resolve on call logs conversation.message and also allow for GET messages response assert to include more than 2 messages in case they include call logs
