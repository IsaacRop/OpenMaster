import type { ReactNode } from "react";

/**
 * Moldura fixa que simula a tela de um celular: o header e o footer ficam
 * presos, só o miolo rola. É o que faz a lista de conversas e o chat lerem
 * como um app de mensagens em vez de uma página comum — sem isso, uma
 * conversa de 60 mil mensagens vira uma rolagem infinita na página toda.
 *
 * Só do tablet para cima. No celular a moldura desenharia um celular dentro
 * do celular; ali a lista ocupa a largura toda com o cabeçalho grudado, e o
 * chat ocupa a tela inteira abaixo da barra do site (ver `.telefone-*` em
 * globals.css).
 *
 * `lista` tem a altura derivada da largura (fica na altura natural da
 * página); `chat` inverte isso — altura fixada pela viewport, largura
 * derivada por aspect-ratio — porque ali o objetivo é caber sem rolar a página.
 */
export function PhoneFrame({
  header,
  footer,
  children,
  modo = "lista",
}: {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  modo?: "lista" | "chat";
}) {
  return (
    <div className={`telefone telefone-${modo}`}>
      <div className="telefone-tela">
        <div className="telefone-topo">{header}</div>
        <div className="telefone-miolo">{children}</div>
        {footer && <div className="telefone-base">{footer}</div>}
      </div>
    </div>
  );
}
