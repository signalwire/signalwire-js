# `sw-test`

Internal cli tool for running unit tests (Jest), Playwright tests (Chromium), and our custom node test runner for E2E tests.

## Features

You can use the `--mode` flag to specify which mode you want to use. There are currently 3 supported modes: `jest`, `playwright`, and `custom-node`.

Example:
```
$ sw-test --mode=jest
```

### JSON Configuration
By default we'll use the `SW_TEST_CONFIG` environment variable to load the configuration.

**Important**: The value assigned to `SW_TEST_CONFIG` must be a valid JSON string.

### Configuration Options

|               | Unit | Playwright | Custom Node |
| ------------- | ------------- | ------------- | ------------- |
| `env`  | :white_check_mark:  | :white_check_mark:  | :white_check_mark:  |
| `ignoreTests` | :white_check_mark:  | :white_check_mark:  | :white_check_mark:  |
| `ignoreFiles`  | :x:  | :x:  | :white_check_mark:  |

### `env` (`Object`): Environment Variables
You can define the environment variables to be used in your tests in a single spot using JS Object notation.

Example:

```
SW_TEST_CONFIG='{"env": {"NODE_ENV": "test"}}'
```

### `ignoreTests` (`string[]`): Ignore Tests by RegExp
Any tests that match the given regex will be ignored.

Example:

```
SW_TEST_CONFIG='{ "ignoreTests": ["RoomSession"] }'
```

The following tests will be ignored:

```
describe('RoomSession', () => {
  it('should be ignored', () => {
    expect(true).toBe(true);
  });
});
```

### `ignoreFiles` (`string[]`): Ignore Files by name.
Any files that match the given name will be ignored.

Example:
```
SW_TEST_CONFIG='{ "ignoreFiles": ["voice.test.ts"] }'
```
