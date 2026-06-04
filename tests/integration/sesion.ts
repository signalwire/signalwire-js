// 1 - create a new subscriber token
//  POST https://{process.env.SW_SPACE}.signalwire.com/api/fabric/subscribers/tokens
//  HEADERS: Content-Type:'application/json'; Accept:'application/json'
//  BODY: { "reference": process.env.SW_SUBSCRIBER_REFERENCE }
//  Authorization: Basic base64(process.env.SW_PROJECT_ID:process.env.SW_PROJECT_TOKEN)

// 2 - create a new SignalWire instance using the token from step 1

// 3 - assert client user

// 3 - assert transport is connected

// 4 - assert session authenticated

// 5 - assert auth state saved

// 6 - assert protocol saved

// 7 - wait for the first signalwire ping to be replied and disconnected