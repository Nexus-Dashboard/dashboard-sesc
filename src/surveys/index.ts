import { populacao } from "./populacao"
import { stakeholders } from "./stakeholders"
import type { SurveyConfig } from "./types"

export const SURVEYS: Record<SurveyConfig["id"], SurveyConfig> = { populacao, stakeholders }
export const SURVEY_ORDER: SurveyConfig["id"][] = ["populacao", "stakeholders"]

export function getSurveyConfig(id: string | undefined): SurveyConfig | null {
  return id && id in SURVEYS ? SURVEYS[id as SurveyConfig["id"]] : null
}
