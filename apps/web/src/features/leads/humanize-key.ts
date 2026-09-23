/**
 * Meta returns form answers keyed by question key ("full_name", "question1",
 * "what_is_your_budget?"), not by the label people saw. Turn a key into readable text.
 * (Fetching the form's real question labels is listed as future work.)
 */
export function humanizeKey(key: string): string {
  const text = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
}
