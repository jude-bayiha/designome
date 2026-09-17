export function countOccurrences(content, value) {
  if (!value) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = content.indexOf(value, offset);
    if (index === -1) return count;
    count += 1;
    offset = index + value.length;
  }
}

export function inspectManagedBlock(content, startMarker, endMarker) {
  const startCount = countOccurrences(content, startMarker);
  const endCount = countOccurrences(content, endMarker);
  if (startCount !== 1 || endCount !== 1) {
    return { startCount, endCount, block: null, startIndex: -1, endIndex: -1 };
  }

  const startIndex = content.indexOf(startMarker);
  const markerEndIndex = content.indexOf(
    endMarker,
    startIndex + startMarker.length,
  );
  if (markerEndIndex < startIndex) {
    return { startCount, endCount, block: null, startIndex: -1, endIndex: -1 };
  }
  let endIndex = markerEndIndex + endMarker.length;
  if (content.slice(endIndex, endIndex + 2) === '\r\n') endIndex += 2;
  else if (content[endIndex] === '\n') endIndex += 1;

  return {
    startCount,
    endCount,
    block: content.slice(startIndex, endIndex),
    startIndex,
    endIndex,
  };
}

function appendBlock(content, block) {
  if (content.trim() === '') return block;
  return `${content.replace(/\s*$/u, '')}\n\n${block}`;
}

function prependCssBlock(content, block) {
  const charsetMatch = content.match(/^\s*@charset\s+[^;]+;\s*/iu);
  if (!charsetMatch) return `${block}\n${content.replace(/^\s*/u, '')}`;
  return `${charsetMatch[0].trimEnd()}\n${block}\n${content.slice(charsetMatch[0].length).replace(/^\s*/u, '')}`;
}

export function upsertManagedBlock(
  content,
  block,
  startMarker,
  endMarker,
  { placement = 'append' } = {},
) {
  const inspection = inspectManagedBlock(content, startMarker, endMarker);
  if (
    inspection.startCount === 1 &&
    inspection.endCount === 1 &&
    inspection.block !== null
  ) {
    return `${content.slice(0, inspection.startIndex)}${block}${content.slice(inspection.endIndex)}`;
  }
  if (inspection.startCount !== 0 || inspection.endCount !== 0) {
    throw new Error('Managed markers are incomplete or duplicated');
  }
  return placement === 'css-top'
    ? prependCssBlock(content, block)
    : appendBlock(content, block);
}
