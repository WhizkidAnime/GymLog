export type ShareableTemplate = {
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    position: number;
  }>;
};

// Кодирует шаблон в строку для шаринга
export function encodeTemplate(template: ShareableTemplate): string {
  try {
    const json = JSON.stringify(template);
    // Используем encodeURIComponent/btoa для поддержки юникода
    // eslint-disable-next-line deprecation/deprecation
    return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error encoding template:', error);
    throw new Error('Не удалось закодировать шаблон');
  }
}

// Декодирует строку обратно в шаблон
export function decodeTemplate(encoded: string): ShareableTemplate {
  try {
    // eslint-disable-next-line deprecation/deprecation
    const decoded = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const template = JSON.parse(decoded) as ShareableTemplate;

    if (!template.name || !Array.isArray(template.exercises)) {
      throw new Error('Invalid template structure');
    }

    for (const ex of template.exercises) {
      if (!ex.name || typeof ex.sets !== 'number' || typeof ex.rest_seconds !== 'number') {
        throw new Error('Invalid exercise structure');
      }
    }

    return template;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error decoding template:', error);
    throw new Error('Неверный формат ссылки на шаблон');
  }
}

// Генерирует полную ссылку для шаринга
export function generateShareLink(template: ShareableTemplate): string {
  const encoded = encodeTemplate(template);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#/templates/import?data=${encoded}`;
}

// Проверяет, является ли строка валидной ссылкой на шаблон
export function isValidTemplateLink(text: string): boolean {
  try {
    const pattern = /#\/templates\/import\?data=([^&\s]+)/;
    const match = text.match(pattern);
    if (!match || !match[1]) return false;
    decodeTemplate(match[1]);
    return true;
  } catch {
    return false;
  }
}

// Извлекает данные шаблона из ссылки
export function extractTemplateFromLink(link: string): ShareableTemplate | null {
  try {
    const pattern = /#\/templates\/import\?data=([^&\s]+)/;
    const match = link.match(pattern);
    if (!match || !match[1]) return null;
    return decodeTemplate(match[1]);
  } catch {
    return null;
  }
}


