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
    <div className="mx-auto w-full max-w-[400px]">
      <div className="rounded-[2rem] border-[6px] border-paper-3 bg-paper-3 shadow-[0_0_0_1px_var(--color-rule-strong)]">
        <div className="flex h-[min(720px,calc(100vh-260px))] min-h-[460px] flex-col overflow-hidden rounded-[1.5rem] bg-paper">
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
