// Liga as travas do git desta pasta (`.githooks/`): a de segredo antes do commit e do push (#470).
// Roda sozinho no `npm install` (script `prepare`) e no começo de toda sessão do Claude.
// Nunca falha: fora de um repositório git, ou sem git, simplesmente não faz nada.
import { spawnSync } from "node:child_process";

spawnSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
