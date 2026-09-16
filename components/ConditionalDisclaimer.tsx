"use client";

import { usePathname } from "next/navigation";

import Disclaimer from "./Disclaimer";

/**
 * A tela de uma conversa quer ocupar a viewport inteira sem rolagem da
 * página — o rodapé de aviso, sempre presente no resto do site, entraria em
 * conflito com isso. Some só ali; a lista de conversas mantém o rodapé.
 */
export default function ConditionalDisclaimer() {
  const pathname = usePathname();
  if (pathname.startsWith("/conversas/")) return null;
  return <Disclaimer />;
}
