import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useMeQuery } from "@/store/api/authApi";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useSelector((state: RootState) => state.auth.token);
  const location = useLocation();
  const { isLoading, isError } = useMeQuery(undefined, { skip: !token });

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  if (isError) {
    return <Navigate to="/" replace />;
  }

  return children;
}
