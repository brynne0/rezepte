import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/data/useAuth";

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  // Show loading while checking authentication status
  if (loading) {
    return null; // or return a loading spinner component
  }

  if (!isLoggedIn) {
    return <Navigate to="/auth-page" replace />;
  }

  return children;
};

export default ProtectedRoute;
