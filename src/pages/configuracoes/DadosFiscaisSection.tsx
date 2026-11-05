import { useState } from "react";
import {
  definirTokenFocusNfe,
  salvarConfiguracaoFiscal,
  type DadosFiscaisEditaveis,
} from "@/lib/configuracoes";
import { PASSO_A_PASSO_ALIQUOTA_PADRAO } from "@/schemas/aliquotaCompetencia";
import {
  avisoPercentualTributosSimplesVazio,
  percentualTributosSimplesParaSalvar,
} from "@/schemas/percentualTributosSimples";
import { mensagemDeErro } from "@/lib/errors";
import { buscarEnderecoPorCep } from "@/lib/viaCep";
import { REGIME_TRIBUTARIO_LABEL } from "@/types/configuracao";
import type {
  AmbienteFocusNfe,
  ConfiguracaoFiscalLoja,
  RegimeTributario,
} from "@/types/configuracao";

interface DadosFiscaisSectionProps {
  configuracao: ConfiguracaoFiscalLoja | null;
  lojaId: string;
  onSalvo: () => Promise<void>;
}

// Na tela o percentual sempre existe (vazio é null); no salvar ele é opcional.
type FormularioFiscal = DadosFiscaisEditaveis & { percentual_tributos_simples: number | null };

function valorInicial(configuracao: ConfiguracaoFiscalLoja | null): FormularioFiscal {
  return {
    cnpj: configuracao?.cnpj ?? "",
    razao_social: configuracao?.razao_social ?? "",
    nome_fantasia: configuracao?.nome_fantasia ?? "",
    inscricao_estadual: configuracao?.inscricao_estadual ?? "",
    inscricao_municipal: configuracao?.inscricao_municipal ?? "",
    regime_tributario: configuracao?.regime_tributario ?? null,
    cep: configuracao?.cep ?? "",
    rua: configuracao?.rua ?? "",
    numero: configuracao?.numero ?? "",
    bairro: configuracao?.bairro ?? "",
    cidade: configuracao?.cidade ?? "",
    uf: configuracao?.uf ?? "",
    telefone: configuracao?.telefone ?? "",
    email: configuracao?.email ?? "",
    focus_nfe_ambiente: configuracao?.focus_nfe_ambiente ?? "homologacao",
    codigo_municipio: configuracao?.codigo_municipio ?? "",
    item_lista_servico: configuracao?.item_lista_servico ?? "14.01",
    aliquota_iss:
      configuracao?.aliquota_iss !== undefined && configuracao?.aliquota_iss !== null
        ? configuracao.aliquota_iss
        : null,
    percentual_tributos_simples: configuracao?.percentual_tributos_simples ?? null,
    codigo_tributario_municipio: configuracao?.codigo_tributario_municipio ?? "",
    codigo_cnae: configuracao?.codigo_cnae ?? "",
    aliquota_passo_a_passo: configuracao?.aliquota_passo_a_passo ?? "",
  };
}

const campoClasse =
  "w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo text-sakura-purple-dark focus:border-sakura-purple";

export function DadosFiscaisSection({
  configuracao,
  lojaId,
  onSalvo,
}: DadosFiscaisSectionProps) {
  const [valores, setValores] = useState<FormularioFiscal>(() => valorInicial(configuracao));
  // O token nunca volta do banco pra cá (TR-04.2): este campo começa sempre
  // vazio, e só é gravado se alguém colar um token novo. Em branco, o que já
  // está no cofre continua valendo.
  const [novoToken, setNovoToken] = useState("");
  const tokenCadastrado = Boolean(configuracao?.focus_nfe_configurado);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroPercentual, setErroPercentual] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function set<K extends keyof FormularioFiscal>(campo: K, valor: FormularioFiscal[K]) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function aoSairDoCep(valor: string) {
    const endereco = await buscarEnderecoPorCep(valor);
    if (!endereco) return;
    setValores((atual) => ({
      ...atual,
      rua: endereco.logradouro,
      bairro: endereco.bairro,
      cidade: endereco.localidade,
      uf: endereco.uf,
      codigo_municipio: endereco.ibge || atual.codigo_municipio,
    }));
  }

  async function handleSalvar() {
    setErro(null);
    setErroPercentual(null);
    setSalvo(false);
    const percentual = percentualTributosSimplesParaSalvar(
      valores.regime_tributario,
      valores.percentual_tributos_simples,
    );
    if (percentual.erro) {
      // Perto do campo e do botão: a faixa de erro do topo fica fora da vista.
      setErroPercentual(percentual.erro);
      return;
    }
    // Fora do Simples o campo não vai: `campos` vem vazio e o banco guarda o que já tem.
    const { percentual_tributos_simples: _naTela, ...semPercentual } = valores;
    void _naTela;
    setSalvando(true);
    try {
      await salvarConfiguracaoFiscal(lojaId, {
        ...semPercentual,
        ...percentual.campos,
        cnpj: valores.cnpj || null,
        razao_social: valores.razao_social || null,
        nome_fantasia: valores.nome_fantasia || null,
        inscricao_estadual: valores.inscricao_estadual || null,
        inscricao_municipal: valores.inscricao_municipal || null,
        cep: valores.cep || null,
        rua: valores.rua || null,
        numero: valores.numero || null,
        bairro: valores.bairro || null,
        cidade: valores.cidade || null,
        uf: valores.uf || null,
        telefone: valores.telefone || null,
        email: valores.email || null,
        codigo_municipio: valores.codigo_municipio || null,
        item_lista_servico: valores.item_lista_servico || null,
        codigo_tributario_municipio: valores.codigo_tributario_municipio || null,
        codigo_cnae: valores.codigo_cnae || null,
        aliquota_passo_a_passo: valores.aliquota_passo_a_passo || null,
      });
      if (novoToken.trim()) {
        await definirTokenFocusNfe(lojaId, novoToken.trim());
        setNovoToken("");
      }
      await onSalvo();
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar dados fiscais:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  const avisoPercentual = avisoPercentualTributosSimplesVazio(
    valores.regime_tributario,
    valores.percentual_tributos_simples,
  );

  return (
    <>
      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}
      {salvo && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
          Dados fiscais salvos.
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          CNPJ
          <input
            value={valores.cnpj ?? ""}
            onChange={(e) => set("cnpj", e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Inscrição estadual
          <input
            value={valores.inscricao_estadual ?? ""}
            onChange={(e) => set("inscricao_estadual", e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Inscrição municipal
          <input
            value={valores.inscricao_municipal ?? ""}
            onChange={(e) => set("inscricao_municipal", e.target.value)}
            className={campoClasse}
          />
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Razão social
          <input
            value={valores.razao_social ?? ""}
            onChange={(e) => set("razao_social", e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Nome fantasia
          <input
            value={valores.nome_fantasia ?? ""}
            onChange={(e) => set("nome_fantasia", e.target.value)}
            className={campoClasse}
          />
        </label>

        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Regime tributário
          <select
            value={valores.regime_tributario ?? ""}
            onChange={(e) => {
              // Fora do Simples o campo some: o erro dele não pode ficar na tela.
              setErroPercentual(null);
              set("regime_tributario", (e.target.value || null) as RegimeTributario | null);
            }}
            className={campoClasse}
          >
            <option value="">Selecione...</option>
            {(Object.keys(REGIME_TRIBUTARIO_LABEL) as RegimeTributario[]).map((chave) => (
              <option key={chave} value={chave}>
                {REGIME_TRIBUTARIO_LABEL[chave]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Telefone
          <input
            value={valores.telefone ?? ""}
            onChange={(e) => set("telefone", e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          E-mail
          <input
            type="email"
            value={valores.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            className={campoClasse}
          />
        </label>

        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          CEP
          <input
            value={valores.cep ?? ""}
            onChange={(e) => set("cep", e.target.value)}
            onBlur={(e) => aoSairDoCep(e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Rua
          <input
            value={valores.rua ?? ""}
            onChange={(e) => set("rua", e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Número
          <input
            value={valores.numero ?? ""}
            onChange={(e) => set("numero", e.target.value)}
            className={campoClasse}
          />
        </label>

        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Bairro
          <input
            value={valores.bairro ?? ""}
            onChange={(e) => set("bairro", e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Cidade
          <input
            value={valores.cidade ?? ""}
            onChange={(e) => set("cidade", e.target.value)}
            className={campoClasse}
          />
        </label>
        <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          UF
          <input
            value={valores.uf ?? ""}
            onChange={(e) => set("uf", e.target.value.toUpperCase())}
            maxLength={2}
            className={campoClasse}
          />
        </label>
      </div>

      <div className="mt-6 border-t border-sakura-gray/20 pt-4">
        <p className="text-rotulo font-medium text-sakura-purple-dark/90">Integração Focus NFe</p>
        <p className="mt-1 text-rotulo text-sakura-muted">
          Cole aqui o token de acesso quando assinar um plano no Focus NFe. Use o ambiente de
          homologação pra testar sem gerar nota de verdade.
        </p>
        <p className="mt-2 text-rotulo text-sakura-muted">
          {tokenCadastrado
            ? "✓ Já existe um token cadastrado. Ele não aparece aqui de propósito — o token emite e cancela nota no CNPJ da loja, então fica guardado num lugar que nenhum computador lê. Pra trocar, cole o novo e salve; em branco, o atual continua valendo."
            : "Nenhum token cadastrado ainda. Depois de salvo, ele não aparece mais aqui — de propósito."}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="col-span-2 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            {tokenCadastrado ? "Trocar o token" : "Token de acesso"}
            <input
              type="password"
              value={novoToken}
              onChange={(e) => setNovoToken(e.target.value)}
              placeholder={tokenCadastrado ? "Em branco, mantém o atual" : ""}
              autoComplete="off"
              className={campoClasse}
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            Ambiente
            <select
              value={valores.focus_nfe_ambiente}
              onChange={(e) => set("focus_nfe_ambiente", e.target.value as AmbienteFocusNfe)}
              className={campoClasse}
            >
              <option value="homologacao">Homologação (teste)</option>
              <option value="producao">Produção</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 border-t border-sakura-gray/20 pt-4">
        <p className="text-rotulo font-medium text-sakura-purple-dark/90">Emissão de NFS-e (serviço)</p>
        <p className="mt-1 text-rotulo text-sakura-muted">
          Só usados na emissão de NFS-e — a de NFC-e (peça) não precisa de nenhum destes. O código
          do município é o código IBGE da cidade da loja; o item da lista de serviço já vem com o
          padrão de oficina/autocenter ("14.01"), mas confira com seu contador se é o certo pra sua
          atividade. O código tributário do município varia de prefeitura pra prefeitura — só
          preencha se a sua exigir (a emissão vai avisar se faltar algo obrigatório).
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            Código IBGE do município
            <input
              value={valores.codigo_municipio ?? ""}
              onChange={(e) => set("codigo_municipio", e.target.value)}
              className={campoClasse}
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            Item lista de serviço (LC 116)
            <input
              value={valores.item_lista_servico ?? ""}
              onChange={(e) => set("item_lista_servico", e.target.value)}
              className={campoClasse}
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            Alíquota ISS (%)
            <input
              type="number"
              step="0.01"
              value={valores.aliquota_iss ?? ""}
              onChange={(e) => set("aliquota_iss", e.target.value === "" ? null : Number(e.target.value))}
              className={campoClasse}
            />
          </label>
          {valores.regime_tributario === "simples_nacional" && (
            <div className="col-span-3">
              <label className="flex max-w-sm flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
                Percentual aproximado dos tributos do Simples (%)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={valores.percentual_tributos_simples ?? ""}
                  onChange={(e) => {
                    setErroPercentual(null);
                    set(
                      "percentual_tributos_simples",
                      e.target.value === "" ? null : Number(e.target.value),
                    );
                  }}
                  aria-invalid={erroPercentual ? true : undefined}
                  className={campoClasse}
                />
              </label>
              {erroPercentual && (
                <p role="alert" className="mt-1 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">
                  {erroPercentual}
                </p>
              )}
              <p className="mt-1 text-rotulo text-sakura-muted">
                O número vem da contabilidade da loja (Lei da Transparência). Vai na nota de
                serviço.
              </p>
              {avisoPercentual && (
                <p className="mt-2 rounded-lg bg-amber-50 px-4 py-2 text-corpo text-amber-800">
                  {avisoPercentual}
                </p>
              )}
            </div>
          )}
          <label className="col-span-2 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            Código tributário do município (se a prefeitura exigir)
            <input
              value={valores.codigo_tributario_municipio ?? ""}
              onChange={(e) => set("codigo_tributario_municipio", e.target.value)}
              className={campoClasse}
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            Código CNAE
            <input
              value={valores.codigo_cnae ?? ""}
              onChange={(e) => set("codigo_cnae", e.target.value)}
              placeholder="Ex: 4520-0/01"
              className={campoClasse}
            />
          </label>
        </div>
        <p className="mt-2 text-rotulo text-sakura-muted">
          O código CNAE está no Cartão CNPJ da empresa, em "Atividade econômica principal" —
          algumas prefeituras (Araraquara incluída) exigem esse campo pra autorizar a NFS-e.
        </p>

        <label className="mt-4 flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
          Como cadastrar a alíquota no portal da prefeitura
          <textarea
            value={valores.aliquota_passo_a_passo ?? ""}
            onChange={(e) => set("aliquota_passo_a_passo", e.target.value)}
            rows={5}
            placeholder={PASSO_A_PASSO_ALIQUOTA_PADRAO}
            className={campoClasse}
          />
        </label>
        <p className="mt-2 text-rotulo text-sakura-muted">
          Todo mês, a prefeitura só autoriza a primeira NFS-e depois que a alíquota daquele mês
          for cadastrada no portal dela. O Início avisa quando chega a hora, e mostra este texto
          junto — deixe em branco pra usar o caminho do portal de Araraquara, ou escreva o da sua
          cidade.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {erroPercentual && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">
            Não salvou: confira o percentual dos tributos do Simples.
          </p>
        )}
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar dados fiscais"}
        </button>
      </div>
    </>
  );
}
