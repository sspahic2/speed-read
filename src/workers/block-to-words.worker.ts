/// <reference lib="webworker" />

type Block = {
  id: string;
  text?: string;
  page?: number;
};

type Word = {
  word: string;
  blockId: string;
  offset: number;
  page?: number;
};

self.onmessage = (event: MessageEvent<{ blocks: Block[] }>) => {
  const { blocks } = event.data || { blocks: [] };
  const results: { blockId: string; words: Word[] }[] = [];

  for (const block of blocks) {
    if (!block?.id) continue;
    const words = (block.text ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((word, idx) => ({
        word,
        blockId: block.id,
        offset: idx,
        page: block.page,
      }));
    results.push({ blockId: block.id, words });
  }

  // eslint-disable-next-line no-restricted-globals
  (self as unknown as Worker).postMessage(results);
};
