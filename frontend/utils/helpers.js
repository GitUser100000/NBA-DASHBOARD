export function parseDuration(duration) {
  // Example input: "PT34M21.93S"
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);

  if (!match) return "00:00:00";

  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseFloat(match[3] || 0);

  // Pad with leading zeros
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(Math.floor(seconds)).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

// Example usage:
console.log(parseDuration("PT34M21.93S")); // "00:34:21"
console.log(parseDuration("PT1H5M7S"));    // "01:05:07"
console.log(parseDuration("PT00M00.00S")); // "00:00:00"