/**
 * Main App Component
 * Renders the application shell and manages view routing
 */

import { renderWelcomeModal } from './WelcomeModal.js';
import { renderTopBar } from './TopBar.js';
import { renderSidebar } from './Sidebar.js';
import { renderMainContent } from './MainContent.js';
import { renderInboundCallModal } from './InboundCallModal.js';

export function renderApp(container, state) {
  // Create app template
  const template = document.createElement('template');
  template.innerHTML = `
    <div class="app-container">
      <div id="top-bar-container"></div>
      <div class="app-body">
        <div id="sidebar-container"></div>
        <div id="main-content-container"></div>
      </div>
      <div id="welcome-modal-container"></div>
      <div id="inbound-call-modal-container"></div>
    </div>
  `;

  // Add app styles
  const style = document.createElement('style');
  style.textContent = `
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .app-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    #main-content-container {
      flex: 1;
      overflow: auto;
      padding: var(--space-lg);
      background-color: var(--color-background);
    }

    .hidden {
      display: none !important;
    }
  `;

  container.innerHTML = '';
  container.appendChild(style);
  container.appendChild(template.content.cloneNode(true));

  // Get container references
  const topBarContainer = container.querySelector('#top-bar-container');
  const sidebarContainer = container.querySelector('#sidebar-container');
  const mainContentContainer = container.querySelector('#main-content-container');
  const welcomeModalContainer = container.querySelector('#welcome-modal-container');
  const inboundCallModalContainer = container.querySelector('#inbound-call-modal-container');

  // Render function
  function render() {
    // Always render welcome modal (it handles its own visibility)
    renderWelcomeModal(welcomeModalContainer, state);

    if (state.isAuthenticated) {
      // Render main app components
      renderTopBar(topBarContainer, state);
      renderSidebar(sidebarContainer, state);
      renderMainContent(mainContentContainer, state);

      // Render inbound call modal if there's a pending call
      renderInboundCallModal(inboundCallModalContainer, state);

      // Show app body
      topBarContainer.classList.remove('hidden');
      sidebarContainer.parentElement.classList.remove('hidden');
    } else {
      // Hide app body when not authenticated
      topBarContainer.classList.add('hidden');
    }
  }

  // Initial render
  render();

  // Subscribe to state changes
  state.subscribe(render);
}
