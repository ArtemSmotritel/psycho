import { useAuth } from '~/contexts/auth-context';

interface ProtectedComponentProps {
  children: React.ReactNode;
  allowedRoles?: Array<'psychologist' | 'client'>;
}

export function ProtectedComponent({ children, allowedRoles }: ProtectedComponentProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading || !isAuthenticated || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    return null
  }

  return <>{children}</>;
}
