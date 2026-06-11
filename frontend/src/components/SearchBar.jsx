import { useEffect, useState } from 'react';

const ROTATING_PLACEHOLDERS = ['Lead Name', 'Contact number', 'Lead number', 'Sole ID'];
const ROTATE_INTERVAL_MS = 2200;

/**
 * Search input with a Blinkit-style rotating placeholder.
 * The static prefix "search " stays put; the suffix cycles through the
 * options above every ~2 seconds, but only while the user hasn't typed
 * anything yet (so we don't distract them once they're focused on input).
 *
 * Parent owns the value and onChange — debounce / server call belongs there.
 */
export default function SearchBar({
  value,
  onChange,
  className = '',
  placeholders = ROTATING_PLACEHOLDERS,
  ...rest
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Pause rotation once the user starts typing.
    if (value) return undefined;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % placeholders.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [value, placeholders.length]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`search ${placeholders[idx]}…`}
      className={
        className ||
        'px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-bp-purple'
      }
      {...rest}
    />
  );
}
