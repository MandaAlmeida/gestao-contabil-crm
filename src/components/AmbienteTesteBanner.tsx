import { FlaskConical } from "lucide-react";

export const isAmbienteTeste = import.meta.env.VITE_AMBIENTE_TESTE !== "false";

// Selo fixo indicando que o sistema é um ambiente de teste (não bloqueia cliques)
export function AmbienteTesteBanner() {
  if (!isAmbienteTeste) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-lg"
      title="Sem banco de dados e sem login: tudo fica salvo apenas neste navegador"
    >
      <FlaskConical className="h-4 w-4 flex-shrink-0" />
      <span>AMBIENTE DE TESTE · dados salvos só neste navegador</span>
    </div>
  );
}
