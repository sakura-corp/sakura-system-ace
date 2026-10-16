import { useState } from "react";

/** Foto redonda do GitHub; se não carregar, mostra a inicial. */
export function Avatar({ login, avatar }: { login: string; avatar: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou || !avatar) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-livre-fundo text-[10px] font-semibold uppercase text-livre"
      >
        {login.charAt(0)}
      </span>
    );
  }
  return (
    <img src={avatar} alt="" width={20} height={20} className="size-5 shrink-0 rounded-full" onError={() => setFalhou(true)} />
  );
}
