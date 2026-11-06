const SENTENCE_BOUNDARY = /[.!?…]+["'”)\]]*(?=\s)|\n+/g;
const MIN_SENTENCE_CHARS = 12;
const MAX_CLAUSE_CHARS = 160;

/** Cuts streamed text into sentences so speech can start before the whole reply is written. */
export class SentenceChunker {
  private buffer = '';

  push(delta: string): string[] {
    this.buffer += delta;

    const sentences: string[] = [];
    let cutIndex = 0;

    SENTENCE_BOUNDARY.lastIndex = 0;
    let match = SENTENCE_BOUNDARY.exec(this.buffer);

    while (match) {
      const end = match.index + match[0].length;
      const candidate = this.buffer.slice(cutIndex, end).trim();

      if (candidate.length >= MIN_SENTENCE_CHARS) {
        sentences.push(candidate);
        cutIndex = end;
      }

      match = SENTENCE_BOUNDARY.exec(this.buffer);
    }

    this.buffer = this.buffer.slice(cutIndex);

    if (this.buffer.length > MAX_CLAUSE_CHARS) {
      const commaIndex = this.buffer.lastIndexOf(', ');

      if (commaIndex >= MIN_SENTENCE_CHARS) {
        sentences.push(this.buffer.slice(0, commaIndex + 1).trim());
        this.buffer = this.buffer.slice(commaIndex + 1);
      }
    }

    return sentences;
  }

  flush(): string {
    const rest = this.buffer.trim();
    this.buffer = '';

    return rest;
  }
}
