const SEGMENTER = new Intl.Segmenter();

export function firstGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const [first] = SEGMENTER.segment(trimmed);
  return first?.segment ?? "";
}
