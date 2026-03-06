import { useState, useEffect, useRef } from 'react';

interface Suggestion {
    display_name: string;
    lat: string;
    lon: string;
}

interface LocationInputProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string, lat?: number, lon?: number) => void;
}

export default function LocationInput({ label, placeholder, value, onChange }: LocationInputProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchSuggestions = async (q: string) => {
        if (q.length < 2) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`
            );
            const data = await res.json();
            setSuggestions(data);
            setShowDropdown(data.length > 0);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val); // update parent immediately (no coords yet)

        // Debounce API calls
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
    };

    const handleSelect = (s: Suggestion) => {
        // Shorten long display names
        const parts = s.display_name.split(',');
        const shortName = parts.slice(0, 3).join(',').trim();
        setQuery(shortName);
        setSuggestions([]);
        setShowDropdown(false);
        onChange(shortName, parseFloat(s.lat), parseFloat(s.lon));
    };

    return (
        <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
            <label className="form-label">{label}</label>
            <input
                className="form-input"
                placeholder={placeholder}
                value={query}
                onChange={handleInputChange}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                autoComplete="off"
            />
            {loading && (
                <div style={{
                    position: 'absolute', right: 12, top: 34,
                    fontSize: 11, color: 'var(--text-muted)'
                }}>
                    ⏳
                </div>
            )}
            {showDropdown && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: 'var(--bg-card, #111D2E)',
                    border: '1px solid var(--border, #1E3050)',
                    borderRadius: 8,
                    maxHeight: 200,
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    marginTop: 4,
                }}>
                    {suggestions.map((s, i) => {
                        const parts = s.display_name.split(',');
                        const main = parts[0].trim();
                        const sub = parts.slice(1, 4).join(',').trim();
                        return (
                            <div
                                key={i}
                                onClick={() => handleSelect(s)}
                                style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border, #1E3050)' : 'none',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated, #0D1B2A)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E8F4FF)' }}>
                                    📍 {main}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted, #4A6580)', marginTop: 2 }}>
                                    {sub}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
