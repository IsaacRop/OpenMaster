"use client";

import { useEffect, useState } from "react";

/** Total de acessos, ou `null` enquanto carrega / se o contador não está disponível. */
export function useVisitas(): number | null {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/visitas")
      .then((r) => r.json())
      .then(({ total }: { total: number | null }) => vivo && typeof total === "number" && setTotal(total))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return total;
}
