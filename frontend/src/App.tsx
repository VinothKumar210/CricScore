import { ClerkProvider, SignedIn, SignedOut, SignIn, UserButton } from "@clerk/clerk-react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_KEY) {
  throw new Error("Missing Publishable Key");
}

function ClerkProviderWithRoutes() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
    >
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex h-screen flex-col items-center justify-center gap-4">
              <h1 className="text-3xl font-bold">CricScore Frontend</h1>
              <SignedOut>
                <div className="p-4 border rounded shadow">
                  <SignIn />
                </div>
              </SignedOut>
              <SignedIn>
                <p>Welcome back!</p>
                <UserButton />
                <Button>Click Me (Shadcn)</Button>
              </SignedIn>
            </div>
          }
        />
      </Routes>
    </ClerkProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkProviderWithRoutes />
    </BrowserRouter>
  );
}

export default App;
