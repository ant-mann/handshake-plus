(function(root) {
  function getLocalDateKey(date = new Date()) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function getCreatedAtLocalDateKey(createdAt) {
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return '';
    return getLocalDateKey(parsed);
  }

  function isCreatedAtOnLocalDate(createdAt, localDate = new Date()) {
    return getCreatedAtLocalDateKey(createdAt) === getLocalDateKey(localDate);
  }

  function countApplicationsForLocalDate(edges, localDate = new Date()) {
    const targetKey = getLocalDateKey(localDate);
    let count = 0;
    let sawOlderApplication = false;

    for (const edge of edges || []) {
      const createdAt = edge && edge.node && edge.node.createdAt;
      const createdKey = getCreatedAtLocalDateKey(createdAt);
      if (!createdKey) continue;

      if (createdKey === targetKey) {
        count++;
      } else if (createdKey < targetKey) {
        sawOlderApplication = true;
        break;
      }
    }

    return { count, sawOlderApplication };
  }

  const exportsObject = {
    countApplicationsForLocalDate,
    getCreatedAtLocalDateKey,
    getLocalDateKey,
    isCreatedAtOnLocalDate,
  };

  root.HandshakePlusApplicationCount = exportsObject;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObject;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
