import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Register all SignalWire custom elements before React renders them.
// Importing the root entry is the simplest approach — it registers everything including
// sw-call-provider, which is required for all context-consuming components to work.
//
// Sub-path imports are still supported if you want to register only specific components:
//   import '@signalwire/web-components/call-provider'; // always needed first
//   import '@signalwire/web-components/call-media';
//   import '@signalwire/web-components/call-controls';
// The trade-off: you get a smaller initial bundle, but you must track which components
// you're using and ensure sw-call-provider is included whenever call components are present.
import '@signalwire/web-components';

import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
