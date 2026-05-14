import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/config/axios'
import { jwtDecode } from 'jwt-decode'

interface LoginResponse {
    response: string
    userName: string
    token: string
    refreshToken: string
    Id?: string
    message?: string
}

const Login = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
    const login = useAuthStore((state) => state.login)

    // ── Redirect if already authenticated ────────────────────────────────────
    useEffect(() => {
        if (isAuthenticated) {
            const token = sessionStorage.getItem("token");
            const officeIdStr = sessionStorage.getItem("OfficeId");

            if (!token || officeIdStr === null) {
                useAuthStore.getState().logout();
                return;
            }

            try {
                const decoded: any = jwtDecode(token);
                const role = decoded.Role;
                console.log("Already authenticated role:", role);
                // All roles → go to /app (Dashboard)
                navigate('/app', { replace: true });
            } catch {
                navigate('/app', { replace: true });
            }
        }
    }, [isAuthenticated, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await axiosInstance.post<LoginResponse>('/api/token', {
                username,
                password,
            })

            if (response.data.response === '000') {
                const token = response.data.token
                let officeId = 0
                let role: string | null = null
                let multipleSuboffice: string | null = null
                let moduleId: number | null = null
                let subModuleId: number | null = null
                let subOfficeId: number | null = null

                try {
                    const decoded: any = jwtDecode(token)
                    role = decoded.Role || null
                    officeId = Number(decoded.OfficeId || 0)
                    multipleSuboffice = decoded.AllowMultiSubOffice || null
                    moduleId = decoded.ModuleId ? Number(decoded.ModuleId) : null
                    subModuleId = decoded.SubModuleId ? Number(decoded.SubModuleId) : null
                    subOfficeId = decoded.SubOfficeId ? Number(decoded.SubOfficeId) : null

                    sessionStorage.setItem('OfficeId', String(officeId))
                    sessionStorage.setItem('Username', decoded.Username || '')
                    sessionStorage.setItem('SubOffice', decoded.SubOffice || '')
                    sessionStorage.setItem('Office', decoded.Office || '')
                    sessionStorage.setItem('ModuleId', String(moduleId || ''))
                    sessionStorage.setItem('SubModuleId', String(subModuleId || ''))
                    sessionStorage.setItem('SubOfficeId', String(subOfficeId || '0'))

                    console.log("Login role:", role);
                } catch (decodeError) {
                    console.error('Error decoding token:', decodeError)
                }

                sessionStorage.setItem('token', token)
                login(
                    token,
                    response.data.refreshToken,
                    response.data.userName,
                    response.data.Id || '',
                    role,
                    multipleSuboffice,
                    moduleId,
                )

                // ── All roles → Dashboard (/app) ──────────────────────────
                navigate('/app', { replace: true })

            } else {
                setError(response.data?.message || 'Invalid credentials. Please try again.')
            }
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Login failed. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-surface font-body text-on-surface items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-[480px] bg-white rounded-3xl p-10 ambient-shadow relative z-10 border border-surface-container">
                {/* Branding */}
                <div className="flex flex-col items-center gap-4 mb-10">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                        <img src="/TU.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                        <h1 className="font-headline font-black text-2xl text-primary leading-tight">Institutional PMS</h1>
                        <p className="text-xs uppercase tracking-[0.2em] text-outline font-bold mt-1">Property Authority Portal</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username */}
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">
                            Username
                        </label>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">person</span>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline/10 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium placeholder:text-outline/40"
                                placeholder="Employee ID or Username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">
                            Password
                        </label>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full pl-12 pr-12 py-4 bg-surface-container-low border border-outline/10 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium placeholder:text-outline/40"
                                placeholder="••••••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined">
                                    {showPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-error-container/30 border border-error-container text-on-error-container px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <span className="material-symbols-outlined text-error">warning</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:brightness-110 text-white py-4 px-6 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Authorizing...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">login</span>
                                <span>Sign In</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-[10px] font-black uppercase tracking-[0.3em] text-outline opacity-40">
                © 2080 Tribhuvan University System Core
            </div>
        </div>
    )
}

export default Login