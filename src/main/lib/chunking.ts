export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface PageTextInput {
  pageNumber: number;
  text: string;
}

export interface DocumentChunk {
  chunkIndex: number;
  text: string;
  pageNumber?: number;
}

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' '];
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

function resolveChunkOptions(options: ChunkOptions = {}): Required<ChunkOptions> {
  const chunkSize = Math.max(1, options.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const requestedOverlap = Math.max(0, options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP);

  return {
    chunkSize,
    chunkOverlap: Math.min(requestedOverlap, Math.max(0, chunkSize - 1)),
    separators: options.separators ?? DEFAULT_SEPARATORS,
  };
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  if (!text || !text.trim()) return [];

  const { chunkSize, chunkOverlap, separators } = resolveChunkOptions(options);
  const normalizedText = text.trim();

  if (normalizedText.length <= chunkSize) {
    return [normalizedText];
  }

  return recursiveSplit(normalizedText, chunkSize, chunkOverlap, separators);
}

export function chunkDocumentPages(
  pages: PageTextInput[],
  options: ChunkOptions = {}
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const page of pages) {
    const pageChunks = chunkText(page.text, options);

    for (const chunk of pageChunks) {
      chunks.push({
        chunkIndex: chunks.length,
        text: chunk,
        pageNumber: page.pageNumber,
      });
    }
  }

  return chunks;
}

function recursiveSplit(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  separators: string[]
): string[] {
  if (separators.length === 0) {
    return hardSplit(text, chunkSize, chunkOverlap);
  }

  const [separator, ...remainingSeparators] = separators;
  const splits = text.split(separator);
  const groupedSplits: string[] = [];
  let currentGroup: string[] = [];

  for (const piece of splits) {
    const candidate = [...currentGroup, piece].join(separator);

    if (candidate.length <= chunkSize) {
      currentGroup.push(piece);
      continue;
    }

    if (currentGroup.length > 0) {
      groupedSplits.push(currentGroup.join(separator));
    }

    if (piece.length > chunkSize) {
      groupedSplits.push(...recursiveSplit(piece, chunkSize, chunkOverlap, remainingSeparators));
      currentGroup = [];
    } else {
      currentGroup = [piece];
    }
  }

  if (currentGroup.length > 0) {
    groupedSplits.push(currentGroup.join(separator));
  }

  return mergeSplits(groupedSplits, chunkSize, chunkOverlap, separator);
}

function hardSplit(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const chunks: string[] = [];
  const step = Math.max(1, chunkSize - chunkOverlap);

  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + chunkSize).trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

function mergeSplits(
  pieces: string[],
  chunkSize: number,
  chunkOverlap: number,
  joinString: string
): string[] {
  if (pieces.length === 0) return [];

  const chunks: string[] = [];
  let current: string[] = [];

  for (const piece of pieces) {
    const joinCost = current.length > 0 ? joinString.length : 0;
    const currentLength = joinedLength(current, joinString);

    if (current.length > 0 && currentLength + joinCost + piece.length > chunkSize) {
      const chunk = current.join(joinString).trim();
      if (chunk) chunks.push(chunk);

      current = getOverlapTail(current, chunkOverlap, joinString);
    }

    current.push(piece);
  }

  const remainder = current.join(joinString).trim();
  if (remainder) chunks.push(remainder);

  return chunks;
}

function getOverlapTail(pieces: string[], chunkOverlap: number, joinString: string): string[] {
  if (chunkOverlap <= 0) return [];

  const overlapPieces: string[] = [];
  let overlapLength = 0;

  for (let index = pieces.length - 1; index >= 0; index -= 1) {
    const piece = pieces[index];
    const addedLength = piece.length + (overlapPieces.length > 0 ? joinString.length : 0);

    if (overlapLength + addedLength > chunkOverlap) break;

    overlapPieces.unshift(piece);
    overlapLength += addedLength;
  }

  return overlapPieces;
}

function joinedLength(pieces: string[], joinString: string): number {
  if (pieces.length === 0) return 0;

  return pieces.reduce((total, piece) => total + piece.length, 0)
    + joinString.length * (pieces.length - 1);
}
