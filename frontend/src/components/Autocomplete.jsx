import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Reusable autocomplete.
 *
 * Props:
 * - value, onChange: controlled string value. onChange is called as
 *     onChange(stringValue)         // when the user types
 *     onChange(stringLabel, item)   // when the user picks from the dropdown
 *   Consumers that only need the string can ignore the second arg; consumers
 *   that need the full object (e.g. a branch row) read `item`.
 * - placeholder
 * - options: static array of strings OR objects (when objects, set getLabel)
 * - getLabel: (item) => string                 // optional, defaults to identity
 * - getSecondary: (item) => string             // optional, shown as muted text in the row
 * - fetchOptions: async (query) => items[]     // optional, used instead of static `options`
 * - minChars: number                           // default 0
 * - allowFree: boolean                         // if true (default), free text is allowed
 * - disabled
 * - id
 */
export default function Autocomplete({
  value,
  onChange,
  placeholder,
  options,
  getLabel = (x) => (typeof x === 'string' ? x : x?.name ?? ''),
  getSecondary,
  fetchOptions,
  minChars = 0,
  allowFree = true,
  disabled = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [remote, setRemote] = useState([]);
  const wrapRef = useRef(null);

  const list = useMemo(() => {
    if (fetchOptions) return remote;
    const q = (value || '').trim().toLowerCase();
    if (!options) return [];
    if (!q) return options.slice(0, 50);
    return options.filter((o) => getLabel(o).toLowerCase().includes(q)).slice(0, 50);
  }, [options, remote, value, fetchOptions, getLabel]);

  useEffect(() => {
    if (!fetchOptions) return;
    if ((value || '').length < minChars) {
      setRemote([]);
      return;
    }
    let cancel = false;
    const t = setTimeout(() => {
      fetchOptions(value || '').then((items) => { if (!cancel) setRemote(items || []); }).catch(() => {});
    }, 150);
    return () => { cancel = true; clearTimeout(t); };
  }, [value, fetchOptions, minChars]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const choose = (item) => {
    onChange(getLabel(item), item);
    setOpen(false);
  };

  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && list[highlight]) {
        e.preventDefault();
        choose(list[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        id={id}
        type="text"
        value={value || ''}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-bp-purple disabled:bg-gray-100"
      />
      {open && list.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-auto bg-white border rounded shadow-lg">
          {list.map((it, i) => (
            <button
              type="button"
              key={getLabel(it) + i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(it)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center ${
                i === highlight ? 'bg-bp-lavender' : 'hover:bg-gray-50'
              }`}
            >
              <span>{getLabel(it)}</span>
              {getSecondary && (
                <span className="text-xs text-gray-500 ml-3">{getSecondary(it)}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {!allowFree && value && !list.find((it) => getLabel(it).toLowerCase() === value.toLowerCase()) && (
        <div className="text-xs text-amber-700 mt-1">Pick a value from the list</div>
      )}
    </div>
  );
}
