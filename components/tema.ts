/**
 * Único lugar fora do CSS com as cores de fundo em hex: `theme-color` do
 * metadata e o script do `<head>` rodam fora da cascata e não leem variáveis
 * CSS. Se `--color-bg` mudar em globals.css, muda aqui também.
 */
export type Tema = "light" | "dark";

export const CHAVE_TEMA = "om-tema";
export const COR_TEMA: Record<Tema, string> = { light: "#F6F5F1", dark: "#0E0F12" };

/**
 * Roda no `<head>`, antes da primeira pintura: sem isso quem escolheu o tema
 * claro num sistema escuro veria a página piscar escura a cada navegação.
 * Também reescreve o `theme-color`, que no metadata só sabe seguir o sistema.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t!=="light"&&t!=="dark")return;document.documentElement.dataset.theme=t;var c=t==="dark"?"${COR_TEMA.dark}":"${COR_TEMA.light}";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}catch(e){}})();`;
