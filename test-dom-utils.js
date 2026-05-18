const assert = require('assert');

class FakeNode {
  constructor(name) {
    this.name = name;
    this.children = new Set();
  }

  appendChild(child) {
    this.children.add(child);
  }

  contains(candidate) {
    if (!(candidate instanceof FakeNode)) {
      throw new TypeError('parameter 1 is not of type Node');
    }
    return candidate === this || this.children.has(candidate);
  }
}

global.Node = FakeNode;
global.window = {};
const dom = require('./dom-utils.js');

const parent = new FakeNode('parent');
const child = new FakeNode('child');
const outside = new FakeNode('outside');
parent.appendChild(child);

assert.strictEqual(dom.containsNode(parent, child), true);
assert.strictEqual(dom.containsNode(parent, parent), true);
assert.strictEqual(dom.containsNode(parent, outside), false);
assert.strictEqual(dom.containsNode(parent, { not: 'a node' }), false);
assert.strictEqual(dom.containsNode(parent, null), false);
assert.strictEqual(dom.containsNode(null, child), false);

console.log('dom-utils tests passed');
