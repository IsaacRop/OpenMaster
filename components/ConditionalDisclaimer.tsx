"use client";

import { usePathname } from "next/navigation";

import Disclaimer from "./Disclaimer";

/**
 * A tela de uma conversa e a do agente querem ocupar a viewport inteira, com
 * o campo preso ao pé — o rodapé de aviso, sempre presente no resto do site,
 * entraria em conflito com isso. Some só ali (o agente traz o próprio aviso
 * de fonte); a lista de conversas mantém o rodapé.
 */
export default function ConditionalDisclaimer() {
  const pathname = usePathname();
  if (pathname.startsWith("/conversas/") || pathname === "/agente") return null;
  return <Disclaimer />;
}
