# How To Test

## Getting Stated

### .env

Create a .env file in the project root with the variable:

```
# Your SignalWire space hostname (e.g., your-space.signalwire.com)
API_HOST=

# Your SignalWire Project ID
PROJECT_ID=

# Your SignalWire API Token
API_TOKEN=

# Your Application ID
APP_ID=

# Default subscriber reference for SAT tokens
SAT_REFERENCE=
```

### Build

```bash
>npm install
>npm build
```

## Run the test

```bash
>npm playground
```

- Open the browser in <http://localhost:5173/>
- choose the fabric playground
- set the desired Host server
- set the SAT (scroll back the console you started the server to get a SAT value)
- set an valid address to call
- click connect
- click Dial Call
