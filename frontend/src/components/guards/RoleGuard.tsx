import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../constants/enums';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback = null }) => {
    const { role, isAuthenticated } = useAuthStore();

    if (!isAuthenticated) return null; // Or redirect

    if (allowedRoles.includes(role)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
