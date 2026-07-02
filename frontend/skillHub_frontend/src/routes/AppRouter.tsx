import { Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AboutPage from "../pages/AboutPage";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import ProfessionalsPage from "../pages/ProfessionalsPage";
import RegisterPage from "../pages/RegisterPage";

function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/professionals" element={<ProfessionalsPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
