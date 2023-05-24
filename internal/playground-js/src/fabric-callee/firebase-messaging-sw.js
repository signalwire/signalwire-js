importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseApp = firebase.initializeApp({
  apiKey: '<COPY IT FROM .env CONFIG>',
  authDomain: '<COPY IT FROM .env CONFIG>',
  projectId: '<COPY IT FROM .env CONFIG>',
  storageBucket: '<COPY IT FROM .env CONFIG>',
  messagingSenderId: '<COPY IT FROM .env CONFIG>',
  appId: '<COPY IT FROM .env CONFIG>',
  measurementId: '<COPY IT FROM .env CONFIG>'
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = 'Background Freeswitch PN';
  const notificationOptions = {
    body: payload.notification
  };

  if(window.localStorage) {
    window.localStorage.setItem('fabric.callee.payload', payload.notification)
  }
  console.log(payload.notification)

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
// [END messaging_init_in_sw_modular]
