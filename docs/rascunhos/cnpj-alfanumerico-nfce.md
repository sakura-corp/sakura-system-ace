# CNPJ com letras na NFC-e: o destinatário pessoa jurídica (PROPOSTA, depende da #513)

> **Proposta pra Sofia revisar. Nenhum código foi mudado.** A tarefa depende da resposta da Focus
> NFe (#513, "Pergunta pra Focus NFe: o formato do CNPJ com letras na API"), que em 09/11/2026
> ainda não tem resposta. Conferido no código em 09/11/2026, na `main` da `v0.9.57`.

## O problema (achado na revisão do PR da #950)

Em `src/lib/focusNfe.ts`, `montarDestinatarioNFCe()` faz
`(cliente?.cpf_cnpj ?? "").replace(/\D/g, "")` e só aceita a pessoa jurídica com 14 **dígitos**.
Desde 07/2026 a Receita emite CNPJ alfanumérico, e o banco já aceita esse formato (migration
`0060`, `[^0-9A-Z]`; `docs/banco.md`). Com um cliente empresa de CNPJ `12.ABC.345/01DE-35`:

- o `replace(/\D/g, "")` deixa `123450135` (9 caracteres), e a nota sai como
  **"consumidor não identificado"**;
- o modal `EmitirNotaFiscalModal.tsx` mostra **"sem o CNPJ no cadastro"**, o que é falso.

O modal já usa `destinatarioIdentificadoNFCe()` (linha 143), sem cópia da regra: consertando
`montarDestinatarioNFCe()`, o aviso acompanha sozinho.

## O que falta saber da Focus (#513)

1. O `cnpj_destinatario` aceita as letras? **Maiúsculas**, sem ponto, barra e traço (a
   Receita define 12 letras ou números + 2 dígitos verificadores numéricos), ou outro formato?
2. A mesma coisa vale pro `cnpj_emitente` (NFC-e), pro `prestador.cnpj` (NFS-e) e pro tomador
   da NFS-e Nacional? (Isso é a parte "emitente" da #513, fora desta tarefa.)
3. A homologação da Focus já aceita CNPJ com letras, pra testar antes da loja?

## A mudança proposta (quando a Focus responder "maiúsculas, só letras e números")

Uma função só, num lugar só (`src/lib/documento.ts` ou junto do `focusNfe.ts`):

```ts
/** CPF/CNPJ só com letras maiúsculas e números (o CNPJ pode ter letras desde 07/2026). */
export function normalizarDocumento(valor: string | null | undefined): string {
  return (valor ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}
```

- **Destinatário da NFC-e** (o escopo desta tarefa): pessoa jurídica identificada quando o
  documento normalizado casa `^[0-9A-Z]{12}[0-9]{2}$`. Pessoa física continua com 11 dígitos
  (`^\d{11}$`; CPF não ganhou letras). O dígito verificador **não** é conferido aqui (o cadastro
  é quem confere; "validação incerta é aviso, nunca tranca", `docs/licoes.md`, item 33).
- O `destinatarioIdentificadoNFCe()` e o modal **não mudam**: seguem a regra pela função.
- **Testes** em `src/lib/focusNfe.test.ts` (escritos antes e vistos reprovar no código de hoje):
  - `12.ABC.345/01DE-35` (exemplo oficial da Receita; o dígito confere) sai como
    `cnpj_destinatario: "12ABC34501DE35"`, com o nome e o indicador "9";
  - em minúsculas (`12.abc.345/01de-35`) sai igual, em maiúsculas;
  - `destinatarioIdentificadoNFCe()` responde `true` pra ele;
  - o CNPJ só de números (`66.217.744/0001-70`) continua saindo igual;
  - letra nos 2 últimos (`12ABC34501DEAB`) e documento curto continuam "não identificado".

**Se a Focus responder outro formato** (por exemplo, recusar letra no destinatário por enquanto),
a mudança vira só o aviso da tela dizendo a verdade ("CNPJ com letras: a nota ainda sai como
consumidor não identificado") em vez de "sem o CNPJ no cadastro".

## O que fica de fora (o mesmo `\D` em outros lugares; tarefa à parte, depois da #513)

Listados no item 6 da parte fiscal de `docs/pendencias-e-futuro.md`:

- `montarCorpoNFSe()` e `montarCorpoNFSeNacional()` em `src/lib/focusNfe.ts` (tomador da NFS-e);
- o porteiro `supabase/functions/focus-nfe/index.ts` (`soDigitos()` e o `length !== 14` do CNPJ
  da loja): com a loja de CNPJ com letras, ele **recusa toda nota**;
- `normalizarCnpj()` em `src/lib/notaFiscalXmlFornecedor.ts` (importar XML de fornecedor);
- `cnpjValido()` em `src/schemas/pix.ts` (chave Pix CNPJ).

Esses mexem no emitente e no porteiro (publicar a função), por isso não entram junto.
