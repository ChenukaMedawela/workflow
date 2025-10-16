require('dotenv').config({ path: './.env.test' });
const util = require('util');
const { ReadableStream } = require('stream/web');
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;
global.ReadableStream = ReadableStream;
global.setImmediate = require('timers').setImmediate;
global.ResizeObserver = require('resize-observer-polyfill');
require('@testing-library/jest-dom');
