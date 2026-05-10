import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
    isAuthenticated: boolean
    token: string | null
    refreshToken: string | null
    userName: string | null
    Id: string | null
    OfficeId: number | null
    role: string | null
    multipleSuboffice: string | null
    moduleId: number | null
    login: (
        token: string,
        refreshToken: string,
        userName: string,
        Id: string,
        OfficeId: number | null,
        role: string | null,
        multipleSuboffice: string | null,
        moduleId?: number | null
    ) => void
    logout: () => void

}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            userName: null,
            Id: null,
            OfficeId: null,
            role: null,
            multipleSuboffice: null,
            moduleId: null,
            login: (token, refreshToken, userName, Id, OfficeId, role, multipleSuboffice, moduleId = null) => set({
                isAuthenticated: true,
                token,
                refreshToken,
                userName,
                Id,
                OfficeId,
                role,
                multipleSuboffice,
                moduleId,
            }),
            logout: () => set({
                isAuthenticated: false,
                token: null,
                refreshToken: null,
                userName: null,
                Id: null,
                OfficeId: null,
                role: null,
                multipleSuboffice: null,
                moduleId: null,
            }),
        }),
        {
            name: 'auth-storage',
        }
    )
)

