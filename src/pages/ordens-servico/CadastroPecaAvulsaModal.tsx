import { Modal } from "@/components/Modal";
import type { ItemOS } from "@/types/os";
import type { Peca } from "@/types/peca";
import { PecaForm } from "../estoque/PecaForm";
import {
  cadastrarPecaNova,
  useDadosParaCadastroDePeca,
  valoresIniciaisDaPecaAvulsa,
} from "./pecaAvulsaCadastro";

interface CadastroPecaAvulsaModalProps {
  /** A peça avulsa que está ganhando cadastro: dela vêm o nome, o preço e o custo. */
  item: Pick<ItemOS, "descricao" | "preco_unitario" | "custo_unitario">;
  /** O cadastro da loja, pro aviso de "peça parecida" ao salvar. */
  pecas: Peca[];
  lojaId: string;
  /** A peça foi criada: quem abriu decide o que fazer com ela. */
  onCadastrada: (peca: Peca) => Promise<void> | void;
  /** O aviso de peça parecida levou pra uma que já existe. */
  onAbrirExistente?: (peca: Peca) => void;
  onFechar: () => void;
}

/**
 * O cadastro de peça do Estoque (`PecaForm`) numa janela, com nome e preço
 * (e custo) da peça avulsa já preenchidos (#655). Usado na aprovação do
 * orçamento e na emissão da nota.
 */
export function CadastroPecaAvulsaModal({
  item,
  pecas,
  lojaId,
  onCadastrada,
  onAbrirExistente,
  onFechar,
}: CadastroPecaAvulsaModalProps) {
  const { categorias, regime, csosnSugerido } = useDadosParaCadastroDePeca(lojaId, pecas, true);

  return (
    <Modal titulo="Cadastrar peça" largura="5xl" onFechar={onFechar}>
      <PecaForm
        valoresIniciais={valoresIniciaisDaPecaAvulsa(item)}
        pecasDoCadastro={pecas}
        onAbrirExistente={onAbrirExistente}
        categorias={categorias}
        regime={regime}
        csosnSugerido={csosnSugerido}
        onSalvar={async (peca, quantidadeInicial) => {
          const criada = await cadastrarPecaNova(peca, quantidadeInicial, lojaId);
          await onCadastrada(criada);
        }}
        onCancelar={onFechar}
      />
    </Modal>
  );
}
