// Returns the number of days in a given month and year.
export const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// Returns the weekday index of the first day of the month (0 for Monday, 6 for Sunday).
export const getFirstDayOfMonth = (date: Date): number => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  // Adjust so that Monday is 0 and Sunday is 6
  return (firstDay === 0) ? 6 : firstDay - 1;
};

// Formats a Date object into 'YYYY-MM-DD' string format.
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Returns the month and year as a localized string (e.g., "October 2024").
export const getMonthYear = (date: Date, language: 'ru' | 'en' = 'ru'): string => {
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  return date.toLocaleString(locale, {
    month: 'long',
    year: 'numeric',
  });
};

// Formats a 'YYYY-MM-DD' string into 'DD.MM.YYYY' format for display.
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString; // Return original string if format is invalid
  }
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
};