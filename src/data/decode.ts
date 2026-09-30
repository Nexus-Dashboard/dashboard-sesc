// Payload de /api/clients/surveys/:id/data -> typed arrays.
// Formato documentado em api/docs/CLIENT_SURVEYS.md.

type Packed = { bits: 8 | 16; data: string }

interface RawColumn {
  type: "code" | "text" | "num"
  bits?: 8 | 16
  data: string | (number | null)[]
  values?: string[]
}

export interface SurveyPayload {
  success: true
  survey: { id: string; client: string; title: string; fileName: string | null; modifiedTime: string | null }
  scope: { level: "state"; client: string; uf: string; region: string } | { level: "admin" }
  n: number
  order: string[]
  columns: Record<string, RawColumn>
  weight: number[]
  geo?: Packed
  uf?: Packed & { values: string[] }
  loadedAt: string
  generatedAt: string
}

export type Codes = Uint8Array | Uint16Array

export interface Dataset {
  id: string
  title: string
  n: number
  modifiedTime: string | null
  scope: SurveyPayload["scope"]
  weight: Float64Array
  /** colunas codificadas e abertas: 0 = em branco */
  codes: Record<string, Codes>
  /** maior código de cada coluna (dimensiona os acumuladores) */
  maxCode: Record<string, number>
  /** rótulos das colunas abertas: código k = texts[col][k - 1] */
  texts: Record<string, string[]>
  /** colunas numéricas: NaN = em branco */
  nums: Record<string, Float64Array>
  /** state_user: 2 = estado, 1 = região, 0 = fora */
  geo: Uint8Array | null
  /** admin: índice (1..) em ufValues */
  uf: Codes | null
  ufValues: string[]
}

function unpack({ bits, data }: Packed): Codes {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bits === 16 ? new Uint16Array(bytes.buffer) : bytes
}

function maxOf(values: Codes) {
  let max = 0
  for (let i = 0; i < values.length; i++) if (values[i] > max) max = values[i]
  return max
}

export function decodeSurvey(payload: SurveyPayload): Dataset {
  const codes: Dataset["codes"] = {}
  const maxCode: Dataset["maxCode"] = {}
  const texts: Dataset["texts"] = {}
  const nums: Dataset["nums"] = {}

  for (const name of payload.order) {
    const column = payload.columns[name]
    if (column.type === "num") {
      nums[name] = Float64Array.from(column.data as (number | null)[], (value) => (value === null ? NaN : value))
    } else {
      const unpacked = unpack({ bits: column.bits ?? 8, data: column.data as string })
      codes[name] = unpacked
      maxCode[name] = maxOf(unpacked)
      if (column.type === "text") texts[name] = column.values ?? []
    }
  }

  return {
    id: payload.survey.id,
    title: payload.survey.title,
    n: payload.n,
    modifiedTime: payload.survey.modifiedTime,
    scope: payload.scope,
    weight: Float64Array.from(payload.weight),
    codes,
    maxCode,
    texts,
    nums,
    geo: payload.geo ? (unpack(payload.geo) as Uint8Array) : null,
    uf: payload.uf ? unpack(payload.uf) : null,
    ufValues: payload.uf?.values ?? [],
  }
}
