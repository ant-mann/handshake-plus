(function(root) {
  function isNode(value) {
    return !!value && typeof Node !== 'undefined' && value instanceof Node;
  }

  function containsNode(parent, candidate) {
    if (!isNode(parent) || !isNode(candidate)) return false;
    return parent.contains(candidate);
  }

  const exportsObject = {
    containsNode,
    isNode,
  };

  root.HandshakePlusDom = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
