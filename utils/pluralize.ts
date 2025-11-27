/**
 * Склонение слова в зависимости от числа (русский язык)
 * @param n - число
 * @param one - форма для 1, 21, 31... (тренировка)
 * @param few - форма для 2-4, 22-24... (тренировки)
 * @param many - форма для 5-20, 25-30... (тренировок)
 */
export function pluralize(n: number, one: string, few: string, many: string): string {
  const absN = Math.abs(n);
  const mod10 = absN % 10;
  const mod100 = absN % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return many;
  }

  if (mod10 === 1) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }

  return many;
}
