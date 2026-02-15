const FULL_MM_DD_YY = /^\d{2}\/\d{2}\/\d{2}$/;

export const formatDateInputMMDDYY = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 6);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const daysInMonth = (month: number, fullYear: number): number => {
  return new Date(fullYear, month, 0).getDate();
};

export const isValidMMDDYY = (value: string): boolean => {
  if (!FULL_MM_DD_YY.test(value)) return false;

  const [monthText, dayText, yearText] = value.split('/');
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);

  if (month < 1 || month > 12) return false;

  // Keep 2-digit input format, but validate against a concrete full year.
  const fullYear = 2000 + year;
  const maxDay = daysInMonth(month, fullYear);

  return day >= 1 && day <= maxDay;
};

export const toIsoDateFromMMDDYY = (value: string): string | null => {
  if (!isValidMMDDYY(value)) return null;

  const [monthText, dayText, yearText] = value.split('/');
  const year = `20${yearText}`;

  return `${year}-${monthText}-${dayText}`;
};
