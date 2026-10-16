export type EstadoTarefa = "livre" | "andamento" | "revisao" | "feita";

export type Tarefa = {
  numero: number;
  titulo: string;
  url: string;
  estado: EstadoTarefa;
  dono?: { login: string; avatar: string };
  estimativaHoras?: number;
  prUrl?: string;
};
