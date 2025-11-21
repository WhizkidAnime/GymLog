import { supabase } from '../lib/supabase';

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

const SHORT_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SHORT_CODE_LENGTH = 9;

function generateShortCode() {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto ?? (window as any).msCrypto : undefined;
  let id = '';

  if (cryptoObj && cryptoObj.getRandomValues) {
    const bytes = new Uint8Array(SHORT_CODE_LENGTH);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
      id += SHORT_CODE_ALPHABET[bytes[i] % SHORT_CODE_ALPHABET.length];
    }
    return id;
  }

  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * SHORT_CODE_ALPHABET.length);
    id += SHORT_CODE_ALPHABET[index];
  }

  return id;
}

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
export async function generateShareLink(template: ShareableTemplate): Promise<string> {
  const maxAttempts = 5;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateShortCode();
    const { error } = await (supabase as any)
      .from('template_share_codes')
      .insert({
        id: code,
        template: template,
      });

    if (!error) {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?s=${code}`;
    }

    lastError = error;

    const pgError = error as { code?: string } | null;
    if (!pgError || pgError.code !== '23505') {
      break;
    }
  }

  throw new Error('Не удалось сгенерировать короткую ссылку');
}

// Проверяет, является ли строка валидной ссылкой на шаблон
export function isValidTemplateLink(text: string): boolean {
  try {
    const legacyPattern = /#\/templates\/import\?data=([^&\s]+)/;
    const legacyMatch = text.match(legacyPattern);
    if (legacyMatch && legacyMatch[1]) {
      decodeTemplate(legacyMatch[1]);
      return true;
    }
  } catch {
  }

  const shortPattern = /[?&]s=([a-zA-Z0-9_-]{4,})/;
  const shortMatch = text.match(shortPattern);
  if (shortMatch && shortMatch[1]) {
    return true;
  }

  return false;
}

// Извлекает данные шаблона из ссылки
export async function extractTemplateFromLink(link: string): Promise<ShareableTemplate | null> {
  try {
    const legacyPattern = /#\/templates\/import\?data=([^&\s]+)/;
    const legacyMatch = link.match(legacyPattern);
    if (legacyMatch && legacyMatch[1]) {
      return decodeTemplate(legacyMatch[1]);
    }
  } catch {
    return null;
  }

  const shortPattern = /[?&]s=([a-zA-Z0-9_-]{4,})/;
  const shortMatch = link.match(shortPattern);
  if (!shortMatch || !shortMatch[1]) {
    return null;
  }

  const code = shortMatch[1];

  try {
    const { data, error } = await (supabase as any)
      .from('template_share_codes')
      .select('template')
      .eq('id', code)
      .single();

    if (error || !data) {
      return null;
    }

    const template = data.template as ShareableTemplate;

    if (!template || !template.name || !Array.isArray(template.exercises)) {
      return null;
    }

    for (const ex of template.exercises) {
      if (!ex.name || typeof ex.sets !== 'number' || typeof ex.rest_seconds !== 'number') {
        return null;
      }
    }

    return template;
  } catch {
    return null;
  }
}
