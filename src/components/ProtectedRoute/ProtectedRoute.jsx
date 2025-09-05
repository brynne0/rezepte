import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/data/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  
  if (!isLoggedIn) {
    return <Navigate to="/auth-page" replace />;
  }
  
  return children;
};

export default ProtectedRoute;