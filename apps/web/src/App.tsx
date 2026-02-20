import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

const LandingPage = lazy(() => import("./components/LandingPage"));
const WorkspaceLayout = lazy(() => import("./components/WorkspaceLayout"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-gray-200 text-sm">
      Loading...
    </div>
  );
}

function App() {
  return (
    <>
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
    </>
  );
}

export default App;
