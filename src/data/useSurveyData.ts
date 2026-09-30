import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../lib/api"
import { useAuth } from "../lib/auth/AuthContext"
import { decodeSurvey, type SurveyPayload } from "./decode"
import { SURVEY_ORDER } from "../surveys"

function queryOptions(surveyId: string, userId: string | undefined) {
  return {
    queryKey: ["survey", surveyId, userId],
    queryFn: async ({ signal }: { signal: AbortSignal }) =>
      decodeSurvey(await api<SurveyPayload>(`/api/clients/surveys/${surveyId}/data`, { signal })),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  }
}

export function useSurveyData(surveyId: string) {
  const { session } = useAuth()
  const client = useQueryClient()
  const userId = session?.user.id
  const query = useQuery({ ...queryOptions(surveyId, userId), enabled: Boolean(userId) })

  // Pré-carrega a outra pesquisa assim que a atual chega
  useEffect(() => {
    if (!query.data || !userId) return
    SURVEY_ORDER.filter((id) => id !== surveyId).forEach((id) => client.prefetchQuery(queryOptions(id, userId)))
  }, [query.data, surveyId, userId, client])

  return query
}
