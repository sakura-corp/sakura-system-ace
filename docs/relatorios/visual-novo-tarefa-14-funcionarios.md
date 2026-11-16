# Visual novo, tarefa 14 (#990): Funcionários

> Escrito pelo Claude da tarefa em 16/11/2026. Só aparência: nenhuma conta, regra de comissão, campo ou banco mudou.
> Nada publicado. Fotos em `docs/referencia/visual-novo/andamento/15-funcionarios/` (`antes/` e `depois/`, escuro e claro).

## O que entrou

- **Lista (Cadastro)**: tabela `sakura-tabela`; o status virou `Selo` (Ativo verde, Inativo cinza, sempre com palavra e ícone); "+ Novo funcionário" é o botão laranja da aba; "Editar" fica à vista e "Inativar/Reativar" foi pro botão de três pontos.
- **Ficha (Dados gerais e Família)**: campos `sakura-campo` e `sakura-rotulo`; erro do campo com ícone, palavra e `aria-invalid`; "(obrigatório)" também pro leitor de tela; Cancelar fantasma e "Salvar funcionário" principal.
- **Comissões**: os três totais viraram `CartaoNumero` (com "?" explicando cada um); tabela com valores à direita e em coluna; "Pago" com `Selo`; os avisos amarelos viraram faixas com ícone; "Registrar pagamento" e "Recibo" em janela com rodapé (principal por último).
- **Tudo nos dois temas**, sem classe de tema; contraste, `contraste:telas` e `largura:telas` verdes.

## Onde foi parar o que mudou de lugar

| Antes | Agora |
|---|---|
| Ícone de lápis (editar) | Botão "Editar", escrito, na linha |
| Ícone de olho (inativar/reativar) | "Inativar" / "Reativar" no botão de três pontos ("Mais ações") |
| Frase "A coluna Lucro gerado soma mais…" dentro do cartão de lucro | Faixa azul logo abaixo dos três cartões (mesmo texto, mesma condição) |
| "✓ R$ x em data" | Selo "Pago" + "R$ x em data" |
| Etiquetas "a receber" / "sem custo" depois do valor | Selos "A receber" / "Sem custo" antes do valor |
| "+ Adicionar filho(a)" | Botão fantasma com ícone "+" |

## Os três montes (seção 12)

**Já fez**: status com palavra e ícone; erros com ícone; as quatro tabelas com valor à direita; o "?" nos três totais (texto novo, só explica o que já era); Inativar no menu (reversível, mas fora do alcance de um clique torto).

**Sugere**
- Trocar o `confirm()` do "Desfazer" pagamento por uma janela do programa (hoje é a caixa do sistema, fora do visual). Recomendação: sim, na tarefa de peças.
- A ficha abre **em cima da lista**, que continua embaixo. Recomendação: abrir a ficha numa janela, ou esconder a lista enquanto edita (muda comportamento, precisa do "sim" dela).
- Peças compartilhadas que faltam (não mexi em `src/components/`): uma aba (`Abas`) e uma faixa de aviso (`AvisoDaTela`, hoje em `funcionarios/`) que serviriam às outras telas; hoje 6 telas têm cópia própria da aba. O `AvisoRascunho` ainda é claro-só (`bg-amber-50`) e fica ilegível/feio no tema escuro.
- O menu de três pontos (`AcoesDaLinha`) ainda usa as cores antigas; vem na tarefa 7.

**Virou tarefa**: nada (nenhum defeito achado de passagem).

## Conferências

- `typecheck`, `lint`, `test` (2205+ testes), `contraste`, `contraste:telas` (dois temas), `largura:telas`.
- Testes novos em `FuncionariosSection.test.tsx` (Editar; Inativar e Reativar pelo menu; cadastro sem nome recusado com `aria-invalid`), este último visto reprovar tirando o `aria-invalid`.
- Os testes de comissão e de troca de loja passam sem mudar uma linha de conta.
- `/code-review` (médio) e revisão final do ajudante forte: achados conferidos. Corrigidos: ícones iguais em "atenção" e "informação" (agora três formatos), `aria-current` nas abas (virou `aria-pressed`), cópia do erro de campo (uma só), texto do "?" do lucro (agora diz que serviço sem custo fica de fora), cor do "Remover" (ordem das classes), e o Enter do último campo do modal de pagamento (já corrigido na `main` pela tarefa 7; esta branch junta a `main` antes do PR).
