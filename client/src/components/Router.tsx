import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Layout from "./Layout";

const Home = lazy(() => import("./Home"));
const EditorPage = lazy(() => import("./Editorpage"));
const appRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<h1>Loading...</h1>}>
        <Layout>
          <Home />
        </Layout>
      </Suspense>
    ),
  },
  {
    path: "/editor/:roomId/:username",
    element: (
      <Suspense fallback={<h1>Loading...</h1>}>
        <Layout>
          <EditorPage />
        </Layout>
      </Suspense>
    ),
  },
  {
    path: "*",
    element: <h1>No Page Found</h1>,
  },
]);
export default appRouter;
