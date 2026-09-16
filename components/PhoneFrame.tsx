import type { ReactNode } from "react";

/**
 * Moldura fixa que simula a tela de um celular: o header e o footer ficam
 * presos, só o miolo rola. É o que faz a lista de conversas e o chat lerem
 * como um app de mensagens em vez de uma página comum — sem isso, uma
 * conversa de 60 mil mensagens vira uma rolagem infinita na página toda.
 *
 * O tamanho é width-driven por padrão (bom pra a lista, que fica na altura
 * natural da página). A tela de uma conversa passa `sizeClassName` para
 * inverter isso — altura fixada pela viewport, largura derivada por
 * aspect-ratio — porque ali o objetivo é caber inteiro sem rolagem da página.
 */
export function PhoneFrame({
  header,
  footer,
  children,
  sizeClassName,
}: {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  sizeClassName?: string;
}) {
  return (
    <div className="mx-auto w-fit max-w-full">
      <div className="rounded-[2rem] border-[6px] border-paper-3 bg-paper-3 shadow-[0_0_0_1px_var(--color-rule-strong)]">
        <div
          className={`flex aspect-[9/19.5] flex-col overflow-hidden rounded-[1.5rem] bg-paper ${
            sizeClassName ?? "w-[360px] max-h-[85vh] min-h-[520px]"
          }`}
        >
          <div className="shrink-0 border-b border-rule bg-paper-2 px-4 py-3">{header}</div>
          <div className="flex-1 overflow-y-auto px-3 py-3">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-rule bg-paper-2 px-3 py-2">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
