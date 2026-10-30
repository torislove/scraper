import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Building2, Globe2, Loader2, MapPin, Package, Search, Sparkles, Tag, Wand2
} from 'lucide-react';
import { suggestSearch } from './api';
import { cx } from './ui';

/**
 * SuggestInput
 *
 * One combobox used by every master field. It never validates and never blocks:
 * the operator can type any product, brand, typo or place and press Enter.
 * Suggestions merely accelerate the common case.
 *
 * kind="category" → products / services / categories from /api/search/suggest
 * kind="place"    → state / district / mandal / city / village from the India gazetteer
 */

const PLACE_GROUPS = [
  { key: 'state', title: 'States & UTs', icon: Globe2 },
  { key: 'district', title: 'Districts', icon: Building2 },
  { key: 'subdistrict', title: 'Mandals · Tehsils · Taluks', icon: MapPin },
  { key: 'city', title: 'Cities', icon: Building2 },
  { key: 'town', title: 'Towns', icon: MapPin },
  { key: 'village', title: 'Villages', icon: MapPin }
];

const PLACE_TYPE_LABEL = {
  state: 'STATE',
  district: 'DISTRICT',
  subdistrict: 'MANDAL',
  city: 'CITY',
  town: 'TOWN',
  village: 'VILLAGE'
};

const SCOPE_BY_TYPE = {
  state: 'state',
  district: 'district',
  subdistrict: 'mandal',
  mandal: 'mandal',
  city: 'city',
  town: 'city',
  village: 'city'
};

export default function SuggestInput({
  value = '',
  onChange,
  onSelect,
  kind = 'category',
  placeholder = '',
  id,
  autoFocus = false,
  className = '',
  disabled = false
}) {
  const [items, setItems] = useState([]);
  const [hint, setHint] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const timerRef = useRef(null);
  const requestRef = useRef(0);

  const query = String(value || '').trim();

  useEffect(() => {
    const onDocClick = event => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (query.length < 1) {
      setItems([]);
      setHint(null);
      setOpen(false);
      setLoading(false);
      return undefined;
    }

    clearTimeout(timerRef.current);
    const requestId = ++requestRef.current;

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (kind === 'place') {
          const data = await suggestSearch({ q: query, limit: 10 });
          if (requestRef.current !== requestId) return;
          const places = (data?.suggestions || [])
            .filter(item => item.type === 'location')
            .map((item, index) => ({
              key: `place-${item.level}-${item.value}-${index}`,
              type: 'place',
              placeType: item.level === 'mandal' ? 'subdistrict' : (item.level || 'city'),
              value: item.value,
              label: item.label || item.value,
              subtitle: item.subtitle || item.display || '',
              detail: String(item.detail || '').toUpperCase(),
              scope: item.scope || SCOPE_BY_TYPE[item.level] || 'district',
              raw: item
            }));
          setItems(places);
          setHint(data?.disambiguation || null);
        } else {
          const data = await suggestSearch({ q: query, limit: 8 });
          if (requestRef.current !== requestId) return;
          const cats = (data?.suggestions || [])
            .filter(item => item.type === 'category')
            .map((item, index) => ({
              key: `cat-${item.value}-${index}`,
              type: 'category',
              group: item.group || 'category',
              value: item.value,
              label: item.label || item.value,
              subtitle: item.subtitle || item.familyLabel || '',
              detail: item.detail || 'CATEGORY',
              raw: item
            }));
          setItems(cats);
          setHint(null);
        }
        setActive(-1);
        setOpen(true);
      } catch (error) {
        if (requestRef.current === requestId) {
          setItems([]);
          setHint(null);
          setOpen(false);
        }
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timerRef.current);
  }, [query, kind]);

  const groups = useMemo(() => {
    if (kind === 'category') {
      const defs = [
        { key: 'brand', title: 'Brands', icon: Sparkles },
        { key: 'product', title: 'Products & dealer phrases', icon: Package },
        { key: 'category', title: 'Services & categories', icon: Tag }
      ];
      return defs
        .map(def => ({ ...def, items: items.filter(item => (item.group || 'category') === def.key) }))
        .filter(group => group.items.length);
    }
    return PLACE_GROUPS.map(group => ({
      ...group,
      items: items.filter(item => item.placeType === group.key)
    })).filter(group => group.items.length);
  }, [items, kind]);

  const flat = useMemo(() => groups.flatMap(group => group.items), [groups]);

  const choose = item => {
    if (!item) return;
    onChange?.(item.value);
    onSelect?.(item);
    setOpen(false);
    setActive(-1);
  };

  const chooseLiteral = () => {
    if (!query) return;
    onChange?.(query);
    onSelect?.({
      type: 'literal',
      value: query,
      label: query,
      subtitle: 'Search this exact text',
      literal: true,
      scope: kind === 'place' ? 'district' : undefined
    });
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const total = flat.length + 1;
      setActive(prev => (prev + 1) % total);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const total = flat.length + 1;
      setActive(prev => (prev - 1 + total) % total);
    } else if (event.key === 'Enter') {
      if (active >= 0 && active < flat.length) {
        event.preventDefault();
        choose(flat[active]);
      } else if (active === flat.length) {
        event.preventDefault();
        chooseLiteral();
      }
    }
  };

  const literalActive = active === flat.length;

  return (
    <div className={cx('v2-suggest-field', className)} ref={wrapRef}>
      <div className="v2-suggest-input">
        {kind === 'place' ? <MapPin size={15} /> : <Search size={15} />}
        <input
          id={id}
          type="text"
          value={value}
          onChange={event => onChange?.(event.target.value)}
          onFocus={() => { if (items.length || query) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
        />
        {loading ? <Loader2 size={14} className="v2-spin" /> : <Wand2 size={13} className="v2-suggest-hint" />}
      </div>

      {open && query.length > 0 && (
        <div className="v2-suggest v2-suggest-advanced" role="listbox">
          {hint?.question ? (
            <div className="v2-suggest-ask">
              <b>{hint.question}</b>
              <span>Pick the exact level — city, district, mandal or village. The sweep size changes with it.</span>
            </div>
          ) : null}
          <div className="v2-suggest-groups">
            <div className="v2-suggest-grid">
              {groups.map(group => {
                if (!group.items.length) return null;
                return (
                  <div key={group.key} className="v2-suggest-group">
                    <header>
                      <group.icon size={12} />
                      <span>{group.title}</span>
                      <b>{group.items.length}</b>
                    </header>
                    {group.items.map(item => {
                      const index = flat.indexOf(item);
                      return (
                        <button
                          type="button"
                          key={item.key}
                          role="option"
                          aria-selected={index === active}
                          className={cx('v2-suggest-row', index === active && 'is-active')}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => choose(item)}
                        >
                          <span className="v2-suggest-mark">
                            {item.type === 'category' ? <Tag size={13} /> : <MapPin size={13} />}
                          </span>
                          <span className="v2-suggest-copy">
                            <div className="v2-suggest-top-line">
                              <b className="v2-suggest-title">{item.label}</b>
                              {item.type === 'place' && (
                                <span className="v2-geo-level-badge">{item.detail}</span>
                              )}
                            </div>
                            {item.subtitle && <small>{item.subtitle}</small>}
                          </span>
                          <ArrowRight size={11} className="v2-suggest-arrow" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {flat.length === 0 && (
            <div className="v2-suggest-empty">
              No dictionary match. Press <b>Enter</b> to search “{query}” exactly.
            </div>
          )}

          <button
            type="button"
            className={cx('v2-suggest-row', 'v2-suggest-literal', literalActive && 'is-active')}
            onMouseEnter={() => setActive(flat.length)}
            onClick={chooseLiteral}
            role="option"
            aria-selected={literalActive}
          >
            <span className="v2-suggest-mark"><Search size={13} /></span>
            <span className="v2-suggest-copy">
              <b>Search “{query}” literally</b>
              <small>Any word is allowed — product, brand, service or place.</small>
            </span>
            <ArrowRight size={11} className="v2-suggest-arrow" />
          </button>

          <footer className="v2-suggest-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
            {loading && <span className="v2-suggest-loading"><Loader2 size={10} className="v2-spin" /> searching index</span>}
          </footer>
        </div>
      )}

    </div>
  );
}
