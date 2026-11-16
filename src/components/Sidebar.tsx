import {
  ChartColumn,
  ChevronLeft,
  CircleArrowOutDownLeft,
  CircleArrowOutUpRight,
  ClipboardList,
  FileText,
  House,
  IdCard,
  Info,
  LogOut,
  Moon,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Store,
  Sun,
  Truck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrcamentosAbertos } from "@/hooks/useOrcamentosAbertos";
import { guardarMenuEncolhido, lerMenuEncolhido } from "@/lib/menuLateral";
import { definirTema, useTema } from "@/lib/tema";
import { GRUPOS_DO_MENU, MODULOS, type GrupoDoMenu, type ModuloChave } from "@/types/operador";
import { AreaRolavel } from "./AreaRolavel";
import { Dica } from "./Dica";
import { MarcaDoMenu } from "./Logo";
import { LojaSwitcher } from "./LojaSwitcher";

/**
 * O menu do visual novo (#990, tarefa 3). Regras:
 * docs/referencia/visual-novo/README.md, seção 7.
 *
 * - 14 itens em quatro grupos, cada um com ícone. Quem não tem permissão de um
 *   módulo não vê o item; grupo sem nenhum item some inteiro.
 * - Dois tamanhos: aberto (ícone e nome) e encolhido (só o ícone, com o nome
 *   na dica e pra leitor de tela). O programa lembra a escolha por computador.
 * - O item ativo tem um fundo que DESLIZA de um item pro outro (o "trilho").
 *
 * Nenhuma classe de tema aqui: as cores são nomes de papel e trocam sozinhas
 * no claro (seção 13).
 */

// O ícone de cada módulo. Módulo novo sem ícone aqui não compila.
const ICONE_DO_MODULO: Record<ModuloChave, typeof FileText> = {
  painel: House,
  clientes: Users,
  ordens_servico: ClipboardList,
  garantias: ShieldCheck,
  estoque: Package,
  fornecedores: Truck,
  servicos: Wrench,
  caixa: Wallet,
  contas_pagar: CircleArrowOutUpRight,
  contas_receber: CircleArrowOutDownLeft,
  notas_fiscais: ReceiptText,
  relatorios: ChartColumn,
  funcionarios: IdCard,
};

interface ItemDoMenu {
  chave: string;
  label: string;
  rota: string;
  grupo: GrupoDoMenu;
  icone: typeof FileText;
  numero?: number;
}

// Os estados em strings separadas: o `npm run contraste` mede string por string.
const ITEM_BASE =
  "relative z-[1] flex h-9 flex-none items-center gap-3 overflow-hidden whitespace-nowrap rounded-[10px] px-3 text-corpo font-medium transition-colors baixa:h-8 muito-baixa:h-7";
const ITEM_ATIVO = "text-texto";
const ITEM_PARADO = "text-texto-2 hover:text-texto";
const ICONE_ATIVO = "h-[19px] w-[19px] flex-none text-acao-clara";
const ICONE_PARADO = "h-[19px] w-[19px] flex-none";

const BOTAO_DO_RODAPE_BASE = "grid w-[34px] flex-none place-items-center rounded-[9px] transition-colors";
// Encolhido, os botões do rodapé ficam um embaixo do outro: em tela baixa
// (o notebook de 768) eles perdem altura pra o menu inteiro caber sem rolar.
const ALTURA_DO_RODAPE_ABERTO = "h-[34px] baixa:h-8";
const ALTURA_DO_RODAPE_ENCOLHIDO = "h-[34px] baixa:h-7 muito-baixa:h-6";
const BOTAO_DO_RODAPE_ATIVO = "bg-acao/15 text-acao-clara";
const BOTAO_DO_RODAPE_PARADO = "text-texto-2 hover:bg-passar hover:text-texto";

/** "Marcos Andrade" → "MA"; "Ana" → "A". */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function Sidebar() {
  const { operador, lojaAtual, lojasDisponiveis, logout } = useAuth();
  const [encolhido, setEncolhido] = useState(lerMenuEncolhido);
  const tema = useTema();
  const { pathname } = useLocation();

  const modulosLiberados: readonly ItemDoMenu[] = (
    operador?.admin ? MODULOS : MODULOS.filter((modulo) => operador?.permissoes.includes(modulo.chave))
  ).map((modulo) => ({ ...modulo, icone: ICONE_DO_MODULO[modulo.chave] }));

  // "Orçamentos" (#379) não é um módulo à parte: é do mesmo módulo das OS,
  // então aparece pra quem tem "ordens_servico" e não ganha permissão nova.
  const temOrdens = modulosLiberados.some((modulo) => modulo.chave === "ordens_servico");
  const orcamentosAbertos = useOrcamentosAbertos(lojaAtual?.id, temOrdens);
  const itensDoMenu: ItemDoMenu[] = modulosLiberados.flatMap((modulo) =>
    modulo.chave === "ordens_servico"
      ? [
          modulo,
          {
            chave: "orcamentos",
            label: "Orçamentos",
            rota: "/orcamentos",
            grupo: modulo.grupo,
            icone: FileText,
            numero: orcamentosAbertos,
          },
        ]
      : [modulo],
  );
  // Grupo sem nenhum item liberado some inteiro (não fica um título sozinho).
  const grupos = GRUPOS_DO_MENU.map((grupo) => ({
    ...grupo,
    itens: itensDoMenu.filter((item) => item.grupo === grupo.chave),
  })).filter((grupo) => grupo.itens.length > 0);

  function alternar() {
    const novo = !encolhido;
    guardarMenuEncolhido(novo);
    setEncolhido(novo);
  }

  // Encolhido não cabe a lista das lojas: o ícone da loja abre o menu e põe
  // o foco na lista, pra quem veio trocar de loja chegar nela de uma vez.
  const [focarALoja, setFocarALoja] = useState(false);
  const rodapeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focarALoja || encolhido) return;
    rodapeRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
    setFocarALoja(false);
  }, [focarALoja, encolhido]);

  // O trilho: o fundo laranja fraco que desliza até o item ativo. Ele é um
  // bloco só, posto na altura do link que o roteador marcou como a página de
  // agora. Fora dos itens (Configurações, Diagnóstico), ele some.
  const navRef = useRef<HTMLElement>(null);
  // `desliza`: só quando a pessoa TROCOU de tela. Quando o que mudou foi o
  // desenho do menu (encolheu, a janela ficou mais baixa), o item ativo pula
  // de lugar na hora, e o fundo tem que pular junto, não ir atrás dele.
  const [trilho, setTrilho] = useState<{ topo: number; altura: number; desliza: boolean } | null>(null);
  const telaAnterior = useRef<string | null>(null);
  const chavesDosItens = itensDoMenu.map((item) => item.chave).join(",");
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    function medir(desliza: boolean) {
      const ativo = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
      setTrilho((atual) => {
        if (!ativo) return null;
        const novo = { topo: ativo.offsetTop, altura: ativo.offsetHeight, desliza };
        return atual && atual.topo === novo.topo && atual.altura === novo.altura ? atual : novo;
      });
    }
    medir(telaAnterior.current !== null && telaAnterior.current !== pathname);
    telaAnterior.current = pathname;
    // A altura dos itens muda com a altura da janela (as telas baixas, #876),
    // e os títulos dos grupos mudam de altura ao encolher: medir de novo.
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(() => medir(false));
    observador.observe(nav);
    return () => observador.disconnect();
  }, [pathname, encolhido, chavesDosItens]);

  const temVariasLojas = lojasDisponiveis.length > 1;

  return (
    <aside
      data-menu={encolhido ? "encolhido" : "aberto"}
      className={`relative z-[3] flex h-full flex-none flex-col gap-2.5 border-r border-linha bg-painel px-3 pb-3 pt-3.5 transition-[width] duration-[260ms] ease-suave motion-reduce:transition-none baixa:gap-1.5 baixa:pt-2.5 ${
        encolhido ? "w-[68px]" : "w-[236px]"
      }`}
    >
      <MarcaDoMenu encolhido={encolhido} />

      {/* Vem ANTES dos itens na ordem do teclado: quem chega com o Tab num
          menu encolhido acha primeiro o botão que abre. */}
      <Dica texto={encolhido ? "Abrir o menu" : "Encolher o menu"} lado="direita">
        <button
          type="button"
          onClick={alternar}
          aria-label={encolhido ? "Abrir o menu" : "Encolher o menu"}
          aria-expanded={!encolhido}
          className="absolute -right-[13px] top-[22px] z-[4] grid h-[26px] w-[26px] place-items-center rounded-full border border-linha-forte bg-cartao text-texto-2 transition-colors hover:bg-passar hover:text-texto baixa:top-[18px]"
        >
          <ChevronLeft
            aria-hidden
            className={`h-3.5 w-3.5 transition-transform duration-[260ms] ease-suave motion-reduce:transition-none ${
              encolhido ? "rotate-180" : ""
            }`}
          />
        </button>
      </Dica>

      <div className="-mx-3 min-h-0 flex-1">
        <AreaRolavel>
          {/* Um bloco só por dentro da área rolável: ela remede a barra de
              rolagem quando o PRIMEIRO filho muda de altura (#876). */}
          <nav ref={navRef} aria-label="Menu" className="relative flex flex-col gap-px px-3">
            {trilho && (
              <div
                aria-hidden
                data-trilho
                style={{ transform: `translateY(${trilho.topo}px)`, height: trilho.altura }}
                className={`pointer-events-none absolute inset-x-3 top-0 rounded-[10px] bg-gradient-to-r from-acao/20 to-carmesim/10 ring-1 ring-inset ring-acao-clara/25 ease-suave motion-reduce:transition-none ${
                  trilho.desliza ? "transition-transform duration-300" : ""
                }`}
              />
            )}
            {grupos.length === 0 && !encolhido && (
              <p className="px-3 py-2.5 text-rotulo text-texto-2">
                Nenhum módulo liberado. Fale com o administrador.
              </p>
            )}
            {grupos.length === 0 && encolhido && (
              <p className="sr-only">Nenhum módulo liberado. Fale com o administrador.</p>
            )}
            {grupos.map((grupo, indice) => (
              <div key={grupo.chave} role="group" aria-label={grupo.label} className="flex flex-col gap-px">
                {encolhido ? (
                  // Encolhido, o título vira um traço entre os grupos (o
                  // primeiro não precisa: não há grupo antes dele).
                  indice > 0 && <div aria-hidden className="mx-3.5 my-1.5 h-px flex-none bg-linha baixa:my-[3px]" />
                ) : (
                  <p
                    aria-hidden
                    className="flex h-7 flex-none items-end whitespace-nowrap px-3 pb-1 text-meta font-semibold uppercase tracking-[0.14em] text-texto-3 baixa:h-6 muito-baixa:h-5"
                  >
                    {grupo.label}
                  </p>
                )}
                {grupo.itens.map((item) => (
                  <ItemDoMenuLink key={item.chave} item={item} encolhido={encolhido} />
                ))}
              </div>
            ))}
          </nav>
        </AreaRolavel>
      </div>

      {operador && (
        <div ref={rodapeRef} className="flex flex-none flex-col gap-2 border-t border-linha pt-2.5 baixa:gap-1 baixa:pt-2">
          {/* O nome inteiro fica na dica: aberto, ele pode estar cortado em
              duas linhas; encolhido, só as iniciais aparecem. */}
          <Dica texto={`${operador.nome} (@${operador.usuario})`} lado={encolhido ? "direita" : "cima"}>
            <div className="flex items-center gap-2.5 pl-1">
              <div
                aria-hidden
                className="grid h-9 w-9 flex-none place-items-center rounded-full border border-linha-forte bg-passar text-rotulo font-bold text-texto baixa:h-8 baixa:w-8"
              >
                {iniciais(operador.nome ?? "")}
              </div>
              <div className={encolhido ? "sr-only" : "min-w-0 leading-tight"}>
                {/* Até duas linhas, e não "Marcos A..." (#876). */}
                <p className={encolhido ? "" : "line-clamp-2 break-words text-rotulo font-semibold text-texto"}>
                  {operador.nome}
                </p>
                <p className={encolhido ? "" : "truncate text-meta text-texto-2"}>@{operador.usuario}</p>
              </div>
            </div>
          </Dica>

          {/* A troca de loja (só pra quem tem mais de uma). Encolhido não cabe
              a lista: o ícone diz qual é a loja e abre o menu pra trocar. */}
          {encolhido
            ? temVariasLojas && (
                <Dica texto={`Loja: ${lojaAtual?.nome ?? ""}. Clique pra abrir o menu e trocar.`} lado="direita">
                  <button
                    type="button"
                    onClick={() => {
                      setFocarALoja(true);
                      alternar();
                    }}
                    aria-label={`Abrir o menu pra trocar de loja (agora: ${lojaAtual?.nome ?? ""})`}
                    className={`self-center ${BOTAO_DO_RODAPE_BASE} ${ALTURA_DO_RODAPE_ENCOLHIDO} ${BOTAO_DO_RODAPE_PARADO}`}
                  >
                    <Store aria-hidden className="h-[18px] w-[18px]" />
                  </button>
                </Dica>
              )
            : <LojaSwitcher />}

          <div className={encolhido ? "flex flex-col items-center gap-0.5" : "flex flex-wrap gap-0.5"}>
            {/* Diagnóstico fica FORA do `operador.admin` de propósito: quem
                liga pedindo socorro é quem está no balcão com o cliente na
                frente, e não é ele quem tem senha de administrador. */}
            <LinkDoRodape para="/diagnostico" nome="Diagnóstico" encolhido={encolhido}>
              <Info aria-hidden className="h-[18px] w-[18px]" />
            </LinkDoRodape>
            {operador.admin && (
              <>
                <LinkDoRodape para="/auditoria" nome="Auditoria" encolhido={encolhido}>
                  <SquareCheckBig aria-hidden className="h-[18px] w-[18px]" />
                </LinkDoRodape>
                <LinkDoRodape para="/configuracoes" nome="Configurações" encolhido={encolhido}>
                  <Settings aria-hidden className="h-[18px] w-[18px]" />
                </LinkDoRodape>
              </>
            )}
            {/* O atalho do tema: Configurações só o administrador abre, e a
                aparência é de cada computador. */}
            <BotaoDoRodape
              nome={tema === "escuro" ? "Mudar pro tema claro" : "Mudar pro tema escuro"}
              encolhido={encolhido}
              aoClicar={() => definirTema(tema === "escuro" ? "claro" : "escuro")}
            >
              {tema === "escuro" ? (
                <Sun aria-hidden className="h-[18px] w-[18px]" />
              ) : (
                <Moon aria-hidden className="h-[18px] w-[18px]" />
              )}
            </BotaoDoRodape>
            <BotaoDoRodape nome="Sair" encolhido={encolhido} aoClicar={() => logout()}>
              <LogOut aria-hidden className="h-[18px] w-[18px]" />
            </BotaoDoRodape>
          </div>
        </div>
      )}
    </aside>
  );
}

function ItemDoMenuLink({ item, encolhido }: { item: ItemDoMenu; encolhido: boolean }) {
  const Icone = item.icone;
  return (
    <Dica texto={encolhido ? item.label : ""} lado="direita">
      <NavLink
        to={item.rota}
        end={item.chave === "painel"}
        className={({ isActive }) => `${ITEM_BASE} ${isActive ? ITEM_ATIVO : ITEM_PARADO}`}
      >
        {({ isActive }) => (
          <>
            <Icone aria-hidden strokeWidth={1.9} className={isActive ? ICONE_ATIVO : ICONE_PARADO} />
            <span className={encolhido ? "sr-only" : "min-w-0 flex-1 truncate"}>{item.label}</span>
            {!!item.numero &&
              (encolhido ? (
                // Encolhido não cabe o número: um ponto laranja avisa que tem.
                <span
                  role="img"
                  aria-label={`${item.numero} em aberto`}
                  className="absolute right-[9px] top-[7px] h-1.5 w-1.5 rounded-full bg-acao"
                />
              ) : (
                <span
                  role="img"
                  aria-label={`${item.numero} em aberto`}
                  className="flex-none rounded-full bg-acao/20 px-[7px] py-px text-meta font-bold tabular-nums text-acao-clara"
                >
                  {item.numero}
                </span>
              ))}
          </>
        )}
      </NavLink>
    </Dica>
  );
}

function LinkDoRodape({
  para,
  nome,
  encolhido,
  children,
}: {
  para: string;
  nome: string;
  encolhido: boolean;
  children: ReactNode;
}) {
  return (
    <Dica texto={nome} lado={encolhido ? "direita" : "cima"}>
      <NavLink
        to={para}
        aria-label={nome}
        className={({ isActive }) =>
          `${BOTAO_DO_RODAPE_BASE} ${encolhido ? ALTURA_DO_RODAPE_ENCOLHIDO : ALTURA_DO_RODAPE_ABERTO} ${
            isActive ? BOTAO_DO_RODAPE_ATIVO : BOTAO_DO_RODAPE_PARADO
          }`
        }
      >
        {children}
      </NavLink>
    </Dica>
  );
}

function BotaoDoRodape({
  nome,
  encolhido,
  aoClicar,
  children,
}: {
  nome: string;
  encolhido: boolean;
  aoClicar: () => void;
  children: ReactNode;
}) {
  return (
    <Dica texto={nome} lado={encolhido ? "direita" : "cima"}>
      <button
        type="button"
        onClick={aoClicar}
        aria-label={nome}
        className={`${BOTAO_DO_RODAPE_BASE} ${
          encolhido ? ALTURA_DO_RODAPE_ENCOLHIDO : ALTURA_DO_RODAPE_ABERTO
        } ${BOTAO_DO_RODAPE_PARADO}`}
      >
        {children}
      </button>
    </Dica>
  );
}
