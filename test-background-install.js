const assert = require('node:assert/strict');

let installedListener = null;
const calls = {
  tabsCreate: 0,
  windowsCreate: 0,
  tabsReload: 0,
};

global.importScripts = () => {};
global.chrome = {
  runtime: {
    onInstalled: {
      addListener(listener) {
        installedListener = listener;
      },
    },
    onMessage: {
      addListener() {},
    },
    sendMessage() {
      return Promise.resolve();
    },
  },
  tabs: {
    onUpdated: {
      addListener() {},
      removeListener() {},
    },
    create() {
      calls.tabsCreate++;
      return Promise.resolve({ id: 1 });
    },
    query() {
      return Promise.resolve([]);
    },
    reload() {
      calls.tabsReload++;
    },
    update() {
      return Promise.resolve();
    },
  },
  windows: {
    create() {
      calls.windowsCreate++;
    },
    getCurrent() {
      return Promise.resolve({});
    },
    update() {
      return Promise.resolve();
    },
  },
  storage: {
    local: {
      get() {
        return Promise.resolve({});
      },
      set() {},
      remove() {
        return Promise.resolve();
      },
    },
  },
};

require('./background.js');

if (installedListener) {
  installedListener({ reason: 'install' });
}

assert.equal(calls.tabsCreate, 0, 'fresh install must not open a Handshake tab');
assert.equal(calls.windowsCreate, 0, 'fresh install must not open a browser window');
assert.equal(calls.tabsReload, 0, 'fresh install must not reload user tabs');

console.log('background install tests passed');
