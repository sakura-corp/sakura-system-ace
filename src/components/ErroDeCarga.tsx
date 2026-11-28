import { Aviso } from "./Aviso";
import { Botao } from "./Botao";

/**
 * A lista não carregou (#1017): o que aconteceu e o que fazer.
 *
 * A frase vem da tela, já passada pelo `mensagemDeErro()` (sem internet, ela
 * diz que caiu a conexão). Quando a busca falha, a tela mostra ISTO no lugar
 * do "Nenhum … cadastrado": o vazio só aparece quando a busca deu certo e
 * voltou vazia. Senão parece que os cadastros sumiram.
 *
 * É o mesmo desenho do erro do `MoldeLista` (que já tem o seu), pra tela que
 * ainda não usa o molde. Junto com o `useRecarregarQuandoVoltar`, a lista
 * também busca de novo sozinha quando a internet volta.
 */
export function ErroDeCarga({
  mensagem,
  tentarDeNovo,
  className = "",
}: {
  /** O que aconteceu, em português (o `mensagemDeErro()`). */
  mensagem: string;
  tentarDeNovo: () => void;
  /** Só pra posição (margem, largura). */
  className?: string;
}) {
  return (
    <Aviso tipo="perigo" role="alert" className={className}>
      <p>{mensagem}</p>
      <Botao variante="secundario" className="mt-3" onClick={tentarDeNovo}>
        Tentar de novo
      </Botao>
    </Aviso>
  );
}
