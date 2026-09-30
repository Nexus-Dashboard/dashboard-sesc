import { ChevronDown, GitCompareArrows } from "lucide-react"
import clsx from "clsx"
import type { ScopeKey } from "../../data/engine"
import { REGIONS, REGION_LABELS, UF_LABELS, ufsOfRegion, type RegionSlug } from "../../lib/geo"
import type { SurveyConfig } from "../../surveys/types"
import { useView } from "../../view/ViewContext"
import { Segmented } from "../ui/primitives"

function encode(scope: ScopeKey) {
  return scope.kind === "brasil" ? "brasil" : scope.kind === "region" ? `r:${scope.region}` : `u:${scope.uf}`
}

function decode(value: string): ScopeKey {
  if (value.startsWith("r:")) return { kind: "region", region: value.slice(2) as RegionSlug }
  if (value.startsWith("u:")) return { kind: "uf", uf: value.slice(2) }
  return { kind: "brasil" }
}

export function ScopeControls({ config }: { config: SurveyConfig }) {
  const view = useView()
  const audienceCompare = Boolean(config.audience) && view.audience === "compare"

  return (
    <div className="contents">
      {view.isAdmin ? (
        <label className="relative inline-flex items-center">
          <span className="sr-only">Recorte geográfico</span>
          <select
            value={encode(view.scope)}
            onChange={(event) => view.setScope(decode(event.target.value))}
            className="appearance-none rounded-xl border border-line bg-white py-2 pl-3 pr-9 text-sm font-medium text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="brasil">Brasil</option>
            {REGIONS.map((region) => (
              <optgroup key={region} label={REGION_LABELS[region]}>
                <option value={`r:${region}`}>Região {REGION_LABELS[region]}</option>
                {ufsOfRegion(region).map((uf) => (
                  <option key={uf} value={`u:${uf}`}>
                    {UF_LABELS[uf]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-ink-3" />
        </label>
      ) : (
        view.ownUF &&
        view.ownRegion && (
          <Segmented
            ariaLabel="Recorte geográfico"
            value={encode(view.scope)}
            onChange={(value) => view.setScope(decode(value))}
            options={[
              { value: "brasil", label: "Brasil" },
              { value: `r:${view.ownRegion}`, label: REGION_LABELS[view.ownRegion], title: `Região ${REGION_LABELS[view.ownRegion]}` },
              { value: `u:${view.ownUF}`, label: UF_LABELS[view.ownUF] ?? view.ownUF },
            ]}
          />
        )
      )}

      {config.audience && (
        <Segmented
          ariaLabel="Público"
          value={view.audience === "compare" ? "compare" : String(view.audience)}
          onChange={(value) => view.setAudience(value === "compare" ? "compare" : Number(value))}
          options={[
            { value: "compare", label: "Legislativo × Mídia" },
            ...config.audience.options.map((option) => ({ value: String(option.code), label: option.short })),
          ]}
        />
      )}

      <button
        type="button"
        onClick={() => view.setCompare(!view.compare)}
        disabled={audienceCompare || view.scope.kind === "brasil"}
        aria-pressed={view.compare}
        title={
          audienceCompare
            ? "Escolha um público para comparar recortes geográficos"
            : view.scope.kind === "brasil"
              ? "Escolha uma região ou estado para comparar com o Brasil"
              : "Mostrar Brasil, região e estado lado a lado"
        }
        className={clsx(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition disabled:cursor-not-allowed disabled:opacity-45",
          view.compare && !audienceCompare && view.scope.kind !== "brasil"
            ? "bg-navy-700 text-white ring-navy-700"
            : "bg-white text-ink-2 ring-line hover:text-ink",
        )}
      >
        <GitCompareArrows className="h-4 w-4" aria-hidden />
        Comparar
      </button>
    </div>
  )
}
