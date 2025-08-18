importScripts(
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js'
)
importScripts(
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
)

/**
 * Inspect serviceWorker logs with: https://stackoverflow.com/a/39155070
 */
try {
  const base64Config = new URL(self.location).searchParams.get('firebaseConfig')
  const config = JSON.parse(atob(base64Config))
  console.log('SW Config', config)

  // Initialize the Firebase app in the service worker by passing in
  // your app's Firebase config object.
  // https://firebase.google.com/docs/web/setup#config-object
  const firebaseApp = firebase.initializeApp(config)

  // Retrieve an instance of Firebase Messaging so that it can handle background messages.
  const messaging = firebase.messaging()
  messaging.onBackgroundMessage((payload) => {
    console.log(
      '[firebase-messaging-sw.js] Received background message ',
      payload
    )
    // Customize notification here
    const notificationTitle = payload.notification.body?.title
    const notificationOptions = {
      body: payload.notification.body?.incoming_caller_name,
    }

    if (window.localStorage) {
      window.localStorage.setItem(
        'fabric.callee.payload',
        payload.notification.body
      )
    }
    console.log(payload.notification)

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
  // [END messaging_init_in_sw_modular]
} catch (error) {
  console.log('serviceWorker error', error.message)
}
