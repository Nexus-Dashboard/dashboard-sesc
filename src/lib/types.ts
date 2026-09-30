export type Role = "state_user" | "nexus_admin"

export interface ClientUser {
  id: string
  client: "sesc" | "senac" | "nexus"
  login: string
  identity: string
  name: string
  role: Role
  uf: string | null
  region: string | null
  isActive: boolean
  mustChangePassword: boolean
  isLocked: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientScope {
  level: "state" | "admin"
  client: string
  uf: string | null
  region: string | null
  scopes: string[]
  allowed: { national: boolean; regions: string[]; ufs: string[] } | null
}

export interface AuthResponse {
  success: true
  token: string
  expiresIn: number
  mustChangePassword?: boolean
  user: ClientUser
  scope: ClientScope
}
