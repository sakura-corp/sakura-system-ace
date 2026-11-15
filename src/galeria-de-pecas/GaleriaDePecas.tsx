import { Ellipsis, FileText, Plus, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Botao, LinkBotao } from "@/components/Botao";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Dica } from "@/components/Dica";
import { LinkPlaca } from "@/components/LinkPlaca";
import { Modal } from "@/components/Modal";
import { Selo, type TipoDeSelo } from "@/components/Selo";
import { Valor, Variacao } from "@/components/Valor";
import { avisar } from "@/lib/avisoQueSome";
import { formatarMoeda } from "@/schemas/dinheiro";

/**
 * A mostra das peças do visual novo (#990, tarefa 2): cada peça da seção 6 das
 * regras, desenhada com o componente DE VERDADE, e a linha de código de como
 * usar. Serve pra três coisas: a Sofia ver as peças antes de elas chegarem nas
 * telas; quem for levar uma tela pro visual novo copiar daqui; e o tema claro
 * ter um lugar só pra conferir todas as peças de uma vez.
 *
 * Os dados são inventados (os mesmos nomes do "Auto Center Modelo" do site).
 */

const ORDENS: {
  numero: number;
  cliente: string;
  veiculoId: string;
  placa: string;
  abertura: string;
  status: { tipo: TipoDeSelo; palavra: "Em andamento" | "Concluída" | "Finalizada" | "Cancelada" };
  total: number;
}[] = [
  { numero: 148, cliente: "Ricardo Menezes", veiculoId: "v1", placa: "RTA-4B71", abertura: "hoje", status: { tipo: "info", palavra: "Em andamento" }, total: 1240 },
  { numero: 147, cliente: "Eduardo Salles", veiculoId: "v2", placa: "SBK-3C19", abertura: "hoje", status: { tipo: "atencao", palavra: "Concluída" }, total: 386.5 },
  { numero: 146, cliente: "Juliana Prado", veiculoId: "v3", placa: "PVE-8H55", abertura: "ontem", status: { tipo: "ok", palavra: "Finalizada" }, total: 2179.9 },
  { numero: 145, cliente: "Transportes Boa Vista Ltda", veiculoId: "v4", placa: "QXL-2D40", abertura: "12/11", status: { tipo: "perigo", palavra: "Cancelada" }, total: 0 },
];

function Bloco({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-linha bg-painel p-[18px]">
      <h2 className="text-subtitulo font-bold text-texto">{titulo}</h2>
      {nota && <p className="mt-1 max-w-[70ch] text-corpo text-texto-2">{nota}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Linha({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function Codigo({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-linha bg-fundo px-3 py-2 text-meta text-texto-2">
      <code>{children}</code>
    </pre>
  );
}

export function GaleriaDePecas() {
  const [janelaAberta, setJanelaAberta] = useState(false);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-5 p-6">
      <header>
        <h1 className="text-titulo font-extrabold text-texto">As peças do visual novo</h1>
        <p className="mt-1 max-w-[80ch] text-corpo text-texto-2">
          Cada peça abaixo é o componente de verdade, o mesmo que as telas vão usar. As regras estão em
          docs/referencia/visual-novo/README.md, seção 6. Os dados são inventados.
        </p>
      </header>

      <Bloco
        titulo="Botões"
        nota="Um botão laranja por tela: o próximo passo. A letra em cima do laranja é escura, nunca branca."
      >
        <Linha>
          <LinkBotao to="/ordens-servico/nova" variante="principal" icone={<Plus />}>
            Nova ordem de serviço
          </LinkBotao>
          <Botao>Venda de balcão</Botao>
          <Botao variante="fantasma">Cancelar</Botao>
          <BotaoWhatsapp telefone="16999990000" texto="Seu carro está pronto." rotulo="Avisar" tamanho="medio" />
          <Dica texto="Mais ações">
            <Botao soIcone aria-label="Mais ações" icone={<Ellipsis />} />
          </Dica>
        </Linha>
        <Linha>
          <Botao variante="principal" tamanho="pequeno">
            Faturar
          </Botao>
          <Botao tamanho="pequeno">Abrir a OS</Botao>
          <Botao variante="fantasma" tamanho="pequeno">
            Adicionar forma de pagamento
          </Botao>
          <BotaoWhatsapp telefone="16999990000" texto="Seu carro está pronto." rotulo="Avisar" />
          <span className="text-rotulo text-texto-2">pequeno (32): o da linha de tabela</span>
        </Linha>
        <Linha>
          <Botao variante="principal" tamanho="grande" className="w-64">
            Entrar
          </Botao>
          <span className="text-rotulo text-texto-2">grande (48): o do Login</span>
        </Linha>
        <Linha>
          <Botao variante="principal" disabled>
            Faturar
          </Botao>
          <Botao disabled>Venda de balcão</Botao>
          <Botao variante="fantasma" disabled>
            Cancelar
          </Botao>
          <span className="text-rotulo text-texto-2">desligados: cinza, e ainda dá pra ler o que fariam</span>
        </Linha>
        <Codigo>{`<Botao variante="principal" icone={<Plus />}>Nova ordem de serviço</Botao>
<Botao>Venda de balcão</Botao>   <Botao variante="fantasma">Cancelar</Botao>
<Botao soIcone aria-label="Mais ações" icone={<Ellipsis />} />`}</Codigo>
      </Bloco>

      <Bloco
        titulo="Selos de aviso"
        nota="Toda cor de aviso vem com ícone e palavra. Sem a palavra, a tela não compila. Em andamento é azul e atenção é amarelo, longe do laranja dos botões."
      >
        <Linha>
          <Selo tipo="info" palavra="Em andamento" />
          <Selo tipo="atencao" palavra="Concluída" />
          <Selo tipo="ok" palavra="Finalizada" />
          <Selo tipo="perigo" palavra="Vencida" />
          <Selo tipo="neutro" palavra="Rascunho" />
        </Linha>
        <Linha>
          <Selo tipo="ok" palavra="Autorizada" icone={FileText} />
          <Selo tipo="info" palavra="Na oficina" icone={Wrench} />
          <span className="text-rotulo text-texto-2">com outro ícone, quando o do tipo não conta a história</span>
        </Linha>
        <Codigo>{`<Selo tipo="atencao" palavra="Concluída" />
<Selo tipo="ok" palavra="Autorizada" icone={FileText} />`}</Codigo>
      </Bloco>

      <Bloco
        titulo="Tabela, com a placa"
        nota="Cabeçalho pequeno, linha de 52, valores à direita e em coluna. Na linha, só o botão do próximo passo; o resto vai nos três pontos. A placa é um botão: abre a ficha do veículo."
      >
        <div className="sakura-card overflow-hidden">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Abertura</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ORDENS.map((os) => (
                <tr key={os.numero}>
                  <td className="text-texto-2">OS {os.numero}</td>
                  <td className="font-semibold">{os.cliente}</td>
                  <td>
                    <LinkPlaca veiculoId={os.veiculoId} placa={os.placa} />
                  </td>
                  <td className="text-texto-2">{os.abertura}</td>
                  <td>
                    <Selo tipo={os.status.tipo} palavra={os.status.palavra} />
                  </td>
                  <td className="text-right font-semibold">{formatarMoeda(os.total)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      {os.status.palavra === "Concluída" && (
                        <Botao variante="principal" tamanho="pequeno" onClick={() => setJanelaAberta(true)}>
                          Faturar
                        </Botao>
                      )}
                      {os.status.palavra === "Finalizada" && (
                        <BotaoWhatsapp telefone="16999990000" texto="Seu carro está pronto." rotulo="Avisar" />
                      )}
                      <Dica texto="Mais ações">
                        <Botao
                          soIcone
                          variante="fantasma"
                          tamanho="pequeno"
                          aria-label={`Mais ações da OS ${os.numero}`}
                          icone={<Ellipsis />}
                        />
                      </Dica>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Codigo>{`<div className="sakura-card overflow-hidden">
  <table className="sakura-tabela"> … <th className="text-right">Total</th> … </table>
</div>
<LinkPlaca veiculoId={veiculo.id} placa={veiculo.placa} />`}</Codigo>
      </Bloco>

      <Bloco
        titulo="Campo, select e área de texto"
        nota="Altura 44 (38 no filtro). No foco, a borda fica laranja com um anel fraco. Clique num campo pra ver."
      >
        <div className="sakura-card grid grid-cols-3 gap-4 p-[18px]">
          <label className="sakura-rotulo">
            Buscar por cliente ou placa
            <input className="sakura-campo" placeholder="Ex: João ou ABC1D23" />
          </label>
          <label className="sakura-rotulo">
            Forma de pagamento
            <select className="sakura-campo" defaultValue="pix">
              <option value="pix">Pix</option>
              <option value="cartao">Cartão de crédito</option>
              <option value="dinheiro">Dinheiro</option>
            </select>
          </label>
          <label className="sakura-rotulo">
            Valor
            <input className="sakura-campo text-right font-semibold tabular-nums" defaultValue="620,00" />
          </label>
          <label className="sakura-rotulo">
            De (campo de filtro)
            <input className="sakura-campo sakura-campo-filtro" defaultValue="01/11/2026" />
          </label>
          <label className="sakura-rotulo">
            Telefone (recusado pela validação)
            <input className="sakura-campo" defaultValue="99990000" aria-invalid="true" />
            <span className="text-rotulo text-perigo">Falta o DDD.</span>
          </label>
          <label className="sakura-rotulo">
            CNPJ (desligado)
            <input className="sakura-campo" defaultValue="12.345.678/0001-90" disabled />
          </label>
          <label className="sakura-rotulo col-span-3">
            Observações
            <textarea className="sakura-campo" placeholder="Ex: cliente pediu pra ligar antes de trocar a peça" />
          </label>
        </div>
        <Codigo>{`<label className="sakura-rotulo">
  Buscar por cliente ou placa
  <input className="sakura-campo" placeholder="Ex: João ou ABC1D23" />
</label>`}</Codigo>
      </Bloco>

      <Bloco
        titulo="Cartão de número"
        nota="O rótulo com o “?”, o número em 30 e a variação com seta e com o que ela compara. Prejuízo tem cor, seta e sinal. Ainda sem o fio de gráfico, que entra com o Início."
      >
        <div className="grid grid-cols-4 gap-3.5">
          <CartaoNumero
            titulo="Recebido no mês"
            explicacao="O que entrou no caixa neste mês, já recebido."
            variacao={<Variacao percentual={16} subirEBom comparadoCom="o mesmo período do mês passado" contra="outubro" />}
          >
            <Valor valor={24815} />
          </CartaoNumero>
          <CartaoNumero
            titulo="Lucro do mês"
            explicacao="O recebido menos os custos do mês."
            variacao={<Variacao percentual={-22} subirEBom comparadoCom="o mesmo período do mês passado" contra="outubro" />}
          >
            <Valor valor={-3344} />
          </CartaoNumero>
          <CartaoNumero
            titulo="Ticket médio"
            explicacao="O valor médio de cada venda do mês."
            para="/relatorios"
            variacao={<Variacao percentual={0.2} subirEBom comparadoCom="o mesmo período do mês passado" contra="outubro" />}
          >
            <Valor valor={655.84} />
          </CartaoNumero>
          <CartaoNumero titulo="Custos do mês" explicacao="As contas pagas no mês." semAcesso="Sem acesso a Contas a Pagar">
            <Valor valor={0} />
          </CartaoNumero>
        </div>
        <Codigo>{`<CartaoNumero titulo="Recebido no mês" explicacao="…"
  variacao={<Variacao percentual={16} subirEBom comparadoCom="…" contra="outubro" />}>
  <Valor valor={24815} />
</CartaoNumero>`}</Codigo>
      </Bloco>

      <Bloco
        titulo="Janela, dica e o aviso que some"
        nota="A janela é opaca, com o total em cima e as ações embaixo à direita, o botão principal por último. A dica aparece ao passar o mouse ou ao chegar pelo teclado. O aviso aparece embaixo, no meio, e some sozinho."
      >
        <Linha>
          <Botao onClick={() => setJanelaAberta(true)}>Abrir a janela de faturar</Botao>
          <Botao onClick={() => avisar("OS 148 faturada")}>Mostrar o aviso que some</Botao>
          <Dica texto="Abrir a ficha do veículo">
            <Botao variante="fantasma">Passe o mouse aqui</Botao>
          </Dica>
        </Linha>
        <Codigo>{`<Modal titulo="Faturar a OS 147" total={{ rotulo: "Total da OS", valor: formatarMoeda(386.5) }}
  rodape={<><Botao variante="fantasma">Cancelar</Botao><Botao variante="principal">Confirmar</Botao></>}>…</Modal>
avisar("OS 148 faturada")
<Dica texto="Abrir a ficha do veículo"><button>…</button></Dica>`}</Codigo>
      </Bloco>

      {janelaAberta && (
        <Modal
          titulo="Faturar a OS 147"
          descricao="Eduardo Salles · SBK-3C19"
          largura="3xl"
          total={{ rotulo: "Total da OS", valor: formatarMoeda(386.5) }}
          notaDoRodape={
            <>
              Recebido agora: <b className="text-texto">{formatarMoeda(386.5)}</b>
            </>
          }
          rodape={
            <>
              <Botao variante="fantasma" onClick={() => setJanelaAberta(false)}>
                Cancelar
              </Botao>
              <Botao
                variante="principal"
                onClick={() => {
                  setJanelaAberta(false);
                  avisar("OS 147 faturada");
                }}
              >
                Confirmar o faturamento
              </Botao>
            </>
          }
          onFechar={() => setJanelaAberta(false)}
        >
          <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_150px] gap-2">
            <label className="sakura-rotulo">
              Forma de pagamento
              <select className="sakura-campo" defaultValue="pix">
                <option value="pix">Pix</option>
                <option value="cartao">Cartão de crédito</option>
              </select>
            </label>
            <label className="sakura-rotulo">
              Parcelas
              <select className="sakura-campo" defaultValue="1">
                <option value="1">À vista</option>
                <option value="3">3x</option>
              </select>
            </label>
            <label className="sakura-rotulo">
              Valor
              <input className="sakura-campo text-right font-semibold tabular-nums" defaultValue="386,50" />
            </label>
          </div>
          <div className="mt-3">
            <Botao variante="fantasma" tamanho="pequeno" icone={<Plus />}>
              Adicionar forma de pagamento
            </Botao>
          </div>
        </Modal>
      )}
    </div>
  );
}
