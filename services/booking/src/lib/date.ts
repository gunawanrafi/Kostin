// UTC-based month arithmetic so checkOut doesn't shift with the server's
// local timezone. JS Date's setUTCMonth already clamps day-of-month
// overflow sanely (e.g. Jan 31 + 1 month -> Mar 3, matching native Date math).
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
