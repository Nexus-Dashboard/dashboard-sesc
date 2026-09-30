import { lazy, Suspense, type ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, isAdmin, needsPasswordChange, useAuth } from "./lib/auth/AuthContext"
import { ViewProvider } from "./view/ViewContext"
import { AppShell } from "./components/layout/AppShell"
import { TooltipLayer } from "./components/ui/Tooltip"
import { LoginPage } from "./pages/LoginPage"
import { ChangePasswordPage } from "./pages/ChangePasswordPage"
import { SectionPage } from "./pages/SectionPage"

const UsersPage = lazy(() => import("./pages/admin/UsersPage").then((module) => ({ default: module.UsersPage })))

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand-orange" aria-label="Carregando" />
    </div>
  )
}

/** Exige login e, no primeiro acesso, a troca da senha provisória */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status, session } = useAuth()
  const location = useLocation()
  if (status === "loading") return <FullScreenLoader />
  if (status !== "authenticated" || !session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (needsPasswordChange(session)) return <Navigate to="/trocar-senha" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return isAdmin(session) ? <>{children}</> : <Navigate to="/" replace />
}

function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === "loading") return <FullScreenLoader />
  return status === "authenticated" ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ViewProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/trocar-senha"
                element={
                  <RequireSession>
                    <ChangePasswordPage />
                  </RequireSession>
                }
              />
              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="/populacao/visao-geral" replace />} />
                <Route
                  path="admin/usuarios"
                  element={
                    <RequireAdmin>
                      <Suspense fallback={null}>
                        <UsersPage />
                      </Suspense>
                    </RequireAdmin>
                  }
                />
                <Route path=":surveyId" element={<SectionPage />} />
                <Route path=":surveyId/:sectionId" element={<SectionPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <TooltipLayer />
        </ViewProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
