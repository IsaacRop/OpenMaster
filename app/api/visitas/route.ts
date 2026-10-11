import { NextRequest, NextResponse } from "next/server";

import { contarNaJanela, extrairIp } from "@/lib/agente/rate-limit";
import { registrarAcesso, totalAcessos } from "@/lib/visitas";

/** Segunda rota com fetch em runtime, ao lado de /api/agente: o contador precisa de estado compartilhado. */

const LIMITE_POR_IP = 30;
const JANELA_MS = 60 * 60 * 1000;

export async function GET() {
  return NextResponse.json(
    { total: await totalAcessos() },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=120" } },
  );
}

export async function POST(req: NextRequest) {
  // Sem teto por origem, um script poderia inflar o número em loop.
  const { contagem } = await contarNaJanela(`visitas:${extrairIp(req.headers)}`, JANELA_MS);
  const headers = { "Cache-Control": "no-store" };
  if (contagem > LIMITE_POR_IP) return NextResponse.json({ total: await totalAcessos() }, { status: 429, headers });

  return NextResponse.json({ total: await registrarAcesso() }, { headers });
}
