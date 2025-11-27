// Локальные типы для Supabase Edge Function в Deno
// Эти объявления нужны только для корректной работы TypeScript в IDE.

// Модуль std/http/server из Deno
declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void | Promise<void>;
}

// supabase-js через esm.sh
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  // Упрощённый тип клиента, нам достаточно any для разработки
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
  ): any;
}

// Deno env
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};
