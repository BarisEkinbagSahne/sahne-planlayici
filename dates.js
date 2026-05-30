(function initSahneDates(global) {
  const TURKEY_TZ = "Europe/Istanbul";

  function isValidParts(year, month, day) {
    const dt = new Date(year, month - 1, day);
    return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
  }

  function isoToDisplay(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
    const [yyyy, mm, dd] = iso.split("-");
    return `${dd}.${mm}.${yyyy}`;
  }

  function displayToIso(text) {
    const raw = (text || "").trim();
    const match = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (!match) return null;
    const dd = Number(match[1]);
    const mm = Number(match[2]);
    const yyyy = Number(match[3]);
    if (!isValidParts(yyyy, mm, dd)) return null;
    return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  function parseIsoLocal(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(NaN);
    const [yyyy, mm, dd] = iso.split("-").map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  function sessionDateToIso(sessionDate) {
    if (!sessionDate) return "";
    const dt = new Date(sessionDate);
    if (Number.isNaN(dt.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", { timeZone: TURKEY_TZ }).format(dt);
  }

  global.SahneDates = {
    isoToDisplay,
    displayToIso,
    parseIsoLocal,
    sessionDateToIso,
    isValidParts,
  };
})(typeof window !== "undefined" ? window : globalThis);
