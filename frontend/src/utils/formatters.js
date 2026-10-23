export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function getErrorMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}
