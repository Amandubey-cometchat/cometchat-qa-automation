import { timestampToken } from '../../utils/id-generator';

/** Unique message text safe from Moderation's Contact-details-filter false-positive (avoids raw 10+ digit runs — see timestampToken). */
export function uniqueMessageText(label: string): string {
  return `${label} ${timestampToken()}`;
}

// A single character repeated thousands of times reads as spam to
// CometChat's Moderation Engine and gets silently blocked instead of
// delivered — verified live. Words in varied order still test "is a large
// payload delivered intact" without tripping that heuristic.
const FILLER_WORDS = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'while',
  'testing', 'webhook', 'payload', 'delivery', 'across', 'a', 'large',
  'message', 'body', 'to', 'confirm', 'nothing', 'gets', 'truncated', 'or',
  'corrupted', 'along', 'way', 'even', 'when', 'it', 'is', 'quite', 'long',
];

export function fillerText(length: number): string {
  let out = '';
  while (out.length < length) {
    out += FILLER_WORDS[Math.floor(Math.random() * FILLER_WORDS.length)] + ' ';
  }
  return out.slice(0, length);
}
