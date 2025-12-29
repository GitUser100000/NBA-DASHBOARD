import React, { useMemo, useCallback } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default React.memo(function MyDatePicker({ date, setDate, min, max }) {
  // Parse date string to Date object
  const parseFlexible = useCallback((s) => {
    if (!s) return null;
    const parts = s.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

    // If first part is 4 digits → ISO (YYYY-MM-DD)
    if (String(s.split("-")[0]).length === 4) {
      const [yyyy, mm, dd] = parts;
      const d = new Date(yyyy, mm - 1, dd);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // Otherwise assume DD-MM-YYYY
    const [dd, mm, yyyy] = parts;
    const d = new Date(yyyy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }, []);

  const toISO = useCallback((d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Memoize selected date
  const selectedDate = useMemo(() => {
    return parseFlexible(date) ?? new Date();
  }, [date, parseFlexible]);

  // Memoize min/max dates
  const minDate = useMemo(() => min ? parseFlexible(min) : undefined, [min, parseFlexible]);
  const maxDate = useMemo(() => max ? parseFlexible(max) : undefined, [max, parseFlexible]);

  const handleChange = useCallback((d) => {
    if (d) setDate(toISO(d));
  }, [setDate, toISO]);

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDate]);

  return (
    <div className="date-picker-wrapper">
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        isClearable={false}
        dateFormat="yyyy-MM-dd"
        className="date-picker"
        calendarClassName="calendar"
        minDate={minDate}
        maxDate={maxDate}
        showPopperArrow={false}
      />
      <p style={{ 
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        margin: 0
      }}>
        {formattedDate}
      </p>
    </div>
  );
});
