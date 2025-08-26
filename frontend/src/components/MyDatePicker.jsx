import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function MyDatePicker({ date, setDate, min, max }) {
  // Try ISO first; if not ISO, try DD-MM-YYYY.
  const parseFlexible = (s) => {
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
  };

  const toISO = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // If parse fails, show today (avoids 1930 look)
  const selectedDate = parseFlexible(date) ?? new Date();

  // Optional limits (pass ISO strings in min/max if you want)
  const minDate = min ? parseFlexible(min) : undefined;
  const maxDate = max ? parseFlexible(max) : undefined;

  return (
    <div>
      <DatePicker
        selected={selectedDate}
        onChange={(d) => d && setDate(toISO(d))}
        isClearable={false}
        dateFormat="yyyy-MM-dd"
        className="date-picker"
        calendarClassName="calendar"
        minDate={minDate}
        maxDate={maxDate}
      />
      <p>{toISO(selectedDate)}</p>
    </div>
  );
}
