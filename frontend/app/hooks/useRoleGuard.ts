import { useAuth } from '~/contexts/auth-context';

export function useRoleGuard(allowedRoles: Array<'psychologist' | 'client'>) {
  const { user, isAuthenticated } = useAuth();
  
  const canAccess = isAuthenticated && user && allowedRoles.includes(user.role);
  
  return {
    canAccess,
    userRole: user?.role,
  };
}
