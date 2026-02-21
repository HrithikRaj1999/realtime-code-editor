import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";

const LandingPage = lazy(() => import("./components/LandingPage"));
const WorkspaceLayout = lazy(() => import("./components/WorkspaceLayout"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm">
      Loading...
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <div>
        <Toaster position="top-right" />
      </div>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/editor/:roomId" element={<WorkspaceLayout />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
