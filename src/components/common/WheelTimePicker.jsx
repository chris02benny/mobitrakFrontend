import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);   // 1‥12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);      // 0‥59
const PHASES = ['AM', 'PM'];
const ITEM_H = 44;   // px – height of every drum row
const LOOPS = 100;   // copies of the list rendered for infinite-illusion
const MID = Math.floor(LOOPS / 2);

// ─── Helper: parse an ISO / HH:mm string into { h, m, p } ───────────────────
function parseTime(val) {
    let h = 9, m = 0, p = 'AM';
    if (!val) return { h, m, p };

    try {
        if (val.includes('T')) {
            const d = new Date(val);
            if (!isNaN(d)) {
                const raw = d.getHours();
                h = raw % 12 || 12;
                m = d.getMinutes();
                p = raw >= 12 ? 'PM' : 'AM';
            }
        } else if (val.includes(':')) {
            const [hPart, mPart] = val.split(':');
            const raw = parseInt(hPart, 10);
            h = raw % 12 || 12;
            m = parseInt(mPart, 10);
            p = raw >= 12 ? 'PM' : 'AM';
        }
    } catch (_) { /* ignore */ }

    return { h, m, p };
}

// ─── Helper: build offset for a circular column ──────────────────────────────
function circularOffset(items, value) {
    const idx = items.indexOf(value);
    if (idx === -1) return 0;
    return (MID * items.length + idx) * ITEM_H;
}

// ─── WheelColumn ─────────────────────────────────────────────────────────────
/**
 * A single drum column.
 *
 * Key design decisions to break the feedback loop:
 *  - `isProgrammatic` ref: set to true just before we change scrollTop
 *    programmatically.  The onScroll handler bails out (does not fire onChange)
 *    while this flag is true.  The flag is cleared automatically by the browser
 *    firing the resulting scroll event.
 *  - Snap settle: we only fire onChange after the user *stops* scrolling
 *    (50 ms debounce), so intermediate frames don't update state mid-swipe.
 */
const WheelColumn = React.memo(function WheelColumn({
    items,
    selectedValue,
    onChange,
    circular = true,
    label,
    format,
}) {
    const ref = useRef(null);
    const isProgrammatic = useRef(false);
    const debounceTimer = useRef(null);

    // Build the repeated item list once
    const loopCount = circular ? LOOPS : 1;
    const totalItems = [];
    for (let i = 0; i < loopCount; i++) totalItems.push(...items);

    // ── Programmatic scroll to selected value ──────────────────────────────
    useEffect(() => {
        if (!ref.current) return;
        const target = circular
            ? circularOffset(items, selectedValue)
            : items.indexOf(selectedValue) * ITEM_H;

        // Only re-scroll if we're not already there (avoids triggering scroll)
        if (Math.abs(ref.current.scrollTop - target) < 1) return;

        isProgrammatic.current = true;

        // requestAnimationFrame ensures the DOM is painted before we scroll
        requestAnimationFrame(() => {
            if (ref.current) {
                ref.current.scrollTop = target;
            }
            // Clear flag once browser has fired its scroll event (~1 frame)
            requestAnimationFrame(() => {
                isProgrammatic.current = false;
            });
        });
    }, [selectedValue, items, circular]);

    // ── Scroll event handler ───────────────────────────────────────────────
    const handleScroll = useCallback(() => {
        if (isProgrammatic.current) return; // ignore our own programmatic scrolls

        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            if (!ref.current) return;
            const index = Math.round(ref.current.scrollTop / ITEM_H);
            const len = items.length;
            const value = items[((index % len) + len) % len];
            if (value !== undefined && value !== selectedValue) {
                onChange(value);
            }
        }, 50); // 50 ms settle time – feels instant, prevents mid-swipe updates
    }, [items, selectedValue, onChange]);

    return (
        <div className="flex flex-col items-center w-full">
            {label && (
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {label}
                </span>
            )}
            <div
                ref={ref}
                onScroll={handleScroll}
                className="h-[220px] overflow-y-auto scrollbar-hide snap-y snap-mandatory w-full flex flex-col items-center"
                style={{ scrollbarWidth: 'none' }}
            >
                {/* Top spacer so first item can reach centre */}
                <div style={{ height: `${ITEM_H * 2}px`, flexShrink: 0 }} />

                {totalItems.map((item, idx) => {
                    const isSelected = item === selectedValue;
                    return (
                        <div
                            key={idx}
                            className={`snap-center flex-shrink-0 flex items-center justify-center text-lg transition-all duration-150 w-full select-none cursor-pointer
                                ${isSelected
                                    ? 'text-gray-900 font-bold scale-110'
                                    : 'text-gray-400 font-medium opacity-50'
                                }`}
                            style={{ height: `${ITEM_H}px` }}
                            onClick={() => onChange(item)}
                        >
                            {format ? format(item) : item}
                        </div>
                    );
                })}

                {/* Bottom spacer */}
                <div style={{ height: `${ITEM_H * 2}px`, flexShrink: 0 }} />
            </div>
        </div>
    );
});

// ─── WheelTimePicker ─────────────────────────────────────────────────────────
/**
 * Props:
 *  value    – ISO string or "HH:mm" string (24-hour)
 *  onChange – called with "HH:mm" (24-hour) whenever selection changes
 */
const WheelTimePicker = ({ value, onChange }) => {
    const initial = parseTime(value);
    const [selectedHour, setSelectedHour] = useState(initial.h);
    const [selectedMinute, setSelectedMinute] = useState(initial.m);
    const [selectedPhase, setSelectedPhase] = useState(initial.p);

    // Track the last value we emitted so we don't re-emit identical values
    const lastEmitted = useRef('');

    // ── Sync inbound value prop → state (external calendar day change etc.) ─
    // Only update state if what's parsed from `value` actually differs from
    // what is already selected.  This prevents a re-render/scroll spiral when
    // the parent updates the ISO string merely because the *date* part changed
    // while the time part remains the same.
    useEffect(() => {
        const { h, m, p } = parseTime(value);
        setSelectedHour(prev => prev !== h ? h : prev);
        setSelectedMinute(prev => prev !== m ? m : prev);
        setSelectedPhase(prev => prev !== p ? p : prev);
        // We intentionally only re-run when `value` changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // ── Emit outbound changes ─────────────────────────────────────────────
    useEffect(() => {
        const h24 =
            selectedPhase === 'PM'
                ? (selectedHour === 12 ? 12 : selectedHour + 12)
                : (selectedHour === 12 ? 0 : selectedHour);

        const timeStr = `${String(h24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;

        if (timeStr !== lastEmitted.current) {
            lastEmitted.current = timeStr;
            onChange?.(timeStr);
        }
    }, [selectedHour, selectedMinute, selectedPhase, onChange]);

    return (
        <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden select-none w-full max-w-[280px] mx-auto">
            {/* Fading overlay – top */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white via-white/80 to-transparent z-20 pointer-events-none" />
            {/* Fading overlay – bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent z-20 pointer-events-none" />

            {/* Selection highlight bar */}
            <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 rounded-lg pointer-events-none z-0 border border-amber-100/50 shadow-sm bg-amber-50"
                style={{ height: `${ITEM_H}px` }}
            />

            <div className="flex relative z-10 px-2">
                <WheelColumn
                    items={HOURS}
                    selectedValue={selectedHour}
                    onChange={setSelectedHour}
                    circular
                    format={(v) => String(v).padStart(2, '0')}
                />
                <WheelColumn
                    items={MINUTES}
                    selectedValue={selectedMinute}
                    onChange={setSelectedMinute}
                    circular
                    format={(v) => String(v).padStart(2, '0')}
                />
                <WheelColumn
                    items={PHASES}
                    selectedValue={selectedPhase}
                    onChange={setSelectedPhase}
                    circular={false}
                />
            </div>
        </div>
    );
};

export default WheelTimePicker;
