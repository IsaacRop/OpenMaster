import type { ReactNode } from "react";

/**
 * Moldura fixa que simula a tela de um celular: o header e o footer ficam
 * presos, só o miolo rola. É o que faz a lista de conversas e o chat lerem
 * como um app de mensagens em vez de uma página comum — sem isso, uma
 * conversa de 60 mil mensagens vira uma rolagem infinita na página toda.
 */
export function PhoneFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-[360px] max-w-full">
      <div className="rounded-[2rem] border-[6px] border-paper-3 bg-paper-3 shadow-[0_0_0_1px_var(--color-rule-strong)]">
        {/* aspect-ratio dá a proporção de tela de celular (~9:19.5); o teto em
            vh evita que ela estoure a viewport em janelas baixas. */}
        <div className="flex aspect-[9/19.5] max-h-[85vh] min-h-[520px] flex-col overflow-hidden rounded-[1.5rem] bg-paper">
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
