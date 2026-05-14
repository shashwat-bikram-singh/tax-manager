import { Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

interface ProtectedRouteProps {
    children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

    if (!isAuthenticated) {
        return <Navigate to="/generic-page" replace />
    }

    const officeId = parseInt(sessionStorage.getItem("OfficeId") || "1");
    if (officeId === 0) {
        return <Navigate to="/super-admin" replace />
    }

    return <>{children}</>
}

export default ProtectedRoute

