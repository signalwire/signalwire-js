/**
 * Application State Management
 * Simple observable state for the demo application
 *
 * This implements a minimal reactive state pattern where:
 * 1. State is stored in private properties (_propertyName)
 * 2. Public getters/setters notify subscribers on changes
 * 3. Components subscribe to state and re-render when notified
 *
 * This pattern is similar to how RxJS BehaviorSubjects work in the SDK,
 * but simpler for demo purposes. For production, consider using:
 * - RxJS for reactive streams
 * - Zustand/Jotai for React apps
 * - Lit's reactive properties for web components
 *
 * @example
 * const state = new AppState();
 *
 * // Subscribe to changes
 * const unsubscribe = state.subscribe((state) => {
 *   console.log('Current view:', state.currentView);
 *   renderUI(state);
 * });
 *
 * // Update state (triggers re-render)
 * state.currentView = 'dialpad';
 *
 * // Cleanup
 * unsubscribe();
 */

export class AppState {
  constructor() {
    // --- Navigation State ---
    this._currentView = 'devices'; // Active view: devices, directory, dialpad, quickcall, call
    this._sidebarExpanded = true; // Sidebar expand/collapse state
    this._directoryPanelOpen = false; // Secondary directory panel visibility

    // --- Call State ---
    this._activeCall = null; // Current WebRTCCallSession object
    this._inboundCall = null; // Pending incoming call for accept/reject
    this._selectedParticipant = null; // Participant selected for controls panel

    // --- Authentication State ---
    this._isAuthenticated = false; // Whether user has successfully authenticated
    this._authMode = 'token'; // Auth mode: 'token' (direct) or 'url' (fetch)
    this._authError = null; // Error message to display
    this._authLoading = false; // Loading spinner state

    // --- SDK State ---
    this._signalWire = null; // SignalWire instance from @signalwire/js
    this._displayName = ''; // User's display name from user info
    this._channels = { audio: false, video: false, messaging: false }; // Available channels
    this._isRegistered = false; // SIP registration status
    this._isConnected = false; // WebSocket connection status

    // --- Observer Pattern ---
    this._listeners = new Set(); // Set of listener functions to notify
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function that receives the state object
   * @returns {Function} Unsubscribe function - call to remove the listener
   *
   * @example
   * const unsubscribe = state.subscribe((state) => {
   *   document.getElementById('view').textContent = state.currentView;
   * });
   *
   * // Later, to stop receiving updates:
   * unsubscribe();
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Notify all subscribed listeners of a state change
   * Called automatically by setters - do not call directly
   * @private
   */
  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  // ==========================================
  // Getters and Setters with notifications
  // Each setter calls _notify() to trigger re-renders
  // ==========================================
  get currentView() {
    return this._currentView;
  }
  set currentView(value) {
    this._currentView = value;
    this._notify();
  }

  get sidebarExpanded() {
    return this._sidebarExpanded;
  }
  set sidebarExpanded(value) {
    this._sidebarExpanded = value;
    this._notify();
  }

  get activeCall() {
    return this._activeCall;
  }
  set activeCall(value) {
    this._activeCall = value;
    this._notify();
  }

  get inboundCall() {
    return this._inboundCall;
  }
  set inboundCall(value) {
    this._inboundCall = value;
    this._notify();
  }

  get isAuthenticated() {
    return this._isAuthenticated;
  }
  set isAuthenticated(value) {
    this._isAuthenticated = value;
    this._notify();
  }

  get signalWire() {
    return this._signalWire;
  }
  set signalWire(value) {
    this._signalWire = value;
    this._notify();
  }

  get authToken() {
    return this._authToken;
  }
  set authToken(value) {
    this._authToken = value;
    this._notify();
  }

  get displayName() {
    return this._displayName;
  }
  set displayName(value) {
    this._displayName = value;
    this._notify();
  }

  get channels() {
    return this._channels;
  }
  set channels(value) {
    this._channels = value;
    this._notify();
  }

  get isRegistered() {
    return this._isRegistered;
  }
  set isRegistered(value) {
    this._isRegistered = value;
    this._notify();
  }

  get isConnected() {
    return this._isConnected;
  }
  set isConnected(value) {
    this._isConnected = value;
    this._notify();
  }

  get authMode() {
    return this._authMode;
  }
  set authMode(value) {
    this._authMode = value;
    this._notify();
  }

  get authError() {
    return this._authError;
  }
  set authError(value) {
    this._authError = value;
    this._notify();
  }

  get authLoading() {
    return this._authLoading;
  }
  set authLoading(value) {
    this._authLoading = value;
    this._notify();
  }

  get directoryPanelOpen() {
    return this._directoryPanelOpen;
  }
  set directoryPanelOpen(value) {
    this._directoryPanelOpen = value;
    this._notify();
  }

  get selectedParticipant() {
    return this._selectedParticipant;
  }
  set selectedParticipant(value) {
    this._selectedParticipant = value;
    this._notify();
  }
}
