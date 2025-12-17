import { useAuth } from "@/components/auth/auth-context";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container-responsive content-spacing pb-24 sm:pb-8 min-h-screen min-h-dvh">
      <h1>Hello, {user?.profileName || user?.username || 'Champion'}!</h1>
    </div>
  );
}
