import type { Metadata } from "next";

import AgentPanel from "@/components/AgentPanel";
import { documentos, pessoas, processos, timeline } from "@/lib/data";

export const metadata: Metadata = {
  title: "Agente IA — OpenMaster",
  description: "Pergunte à base do OpenMaster em linguagem simples. Toda resposta cita a fonte pública de onde saiu.",
};

export default function AgentePage() {
  const registros = processos.length + timeline.length + pessoas.length + documentos.length;
  return <AgentPanel registros={registros} />;
}
