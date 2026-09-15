import type { Metadata } from "next";

import AgentPanel from "@/components/AgentPanel";

export const metadata: Metadata = {
  title: "Agente IA — OpenMaster",
  description: "Espaço de consulta em linguagem simples ao futuro agente interno do OpenMaster.",
};

export default function AgentePage() {
  return (
    <div>
      <header className="mb-4 border-b border-rule pb-4">
        <p className="kicker text-seal">Central de consulta</p>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">Agente OpenMaster</h1>
        <p className="mt-1 text-sm text-ink-3">Uma interface preparada para investigar a base por perguntas, sempre com fontes.</p>
      </header>
      <AgentPanel amplo />
    </div>
  );
}
