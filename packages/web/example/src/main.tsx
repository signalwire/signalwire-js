// Importing directly from `@signalwire/web` will take the
// `production` bundle while importing from `../../src` will hot-relad
// as we make changes.

import { sum } from "../../src";

console.log(sum(1, 3))
