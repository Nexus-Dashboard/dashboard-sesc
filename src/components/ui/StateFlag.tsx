import { useState } from "react"
import clsx from "clsx"
import { ofState } from "../../lib/places"

// Bandeira do estado (PNG em /public/flags, 3:2). Sem UF ou se a imagem
// falhar, mostra a sigla / monograma no mesmo espaço.
export function StateFlag({ uf, fallback, className }: { uf: string | null | undefined; fallback?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const box = clsx("h-7 w-10 shrink-0 rounded-[5px]", className)

  if (!uf || failed) {
    return (
      <span className={clsx(box, "flex items-center justify-center bg-brand-orange text-[11px] font-bold text-navy-950")}>
        {uf ?? fallback ?? "NX"}
      </span>
    )
  }

  return (
    <img
      src={`/flags/${uf}.png`}
      alt={`Bandeira ${ofState(uf)}`}
      title={`Bandeira ${ofState(uf)}`}
      onError={() => setFailed(true)}
      className={clsx(box, "object-cover shadow-sm ring-1 ring-black/15")}
    />
  )
}
