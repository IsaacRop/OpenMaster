"use client";

import Compartilhar from "./Compartilhar";
import { useVisitas } from "./useVisitas";

/** Abaixo disso o número parece vazio e desencoraja em vez de convidar. */
const MINIMO_PARA_EXIBIR = 100;

const fmt = (n: number) => n.toLocaleString("pt-BR");

/**
 * O convite principal a compartilhar: diz por que importa e mostra quantas
 * vezes o site já foi acessado (o número é real, ver lib/visitas.ts).
 */
export default function ChamadaCompartilhar({ url, texto }: { url: string; texto: string }) {
  const total = useVisitas();

  return (
    <section className="chamada vidro" aria-labelledby="chamada-titulo">
      <div className="chamada-texto">
        <p className="kicker">Passe adiante</p>
        <h2 id="chamada-titulo" className="chamada-titulo">
          Um caso com fonte em cada linha só pesa se mais gente puder conferir.
        </h2>
        <p className="chamada-sub">
          O que circula por print e áudio some em um dia. Um link para o registro, com a fonte à vista, deixa qualquer pessoa
          checar por conta própria. Mande para quem acompanha o caso.
        </p>
      </div>
      <div className="chamada-acao">
        {total !== null && total >= MINIMO_PARA_EXIBIR && (
          <p className="chamada-contador" aria-live="polite">
            O OpenMaster já foi acessado <strong className="numero">{fmt(total)}</strong> vezes
          </p>
        )}
        <Compartilhar url={url} texto={texto} variante="cartao" />
      </div>
    </section>
  );
}
