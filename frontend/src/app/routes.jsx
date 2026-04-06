// src/routes.jsx
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout"; // Create this
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import DashboardPage from "../pages/DashboardPage";
import CompanySetupPage from "../pages/CompanySetupPage";
import Scope1Page from "../pages/Scope1Page";
import Scope2Page from "../pages/Scope2Page";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import HelpPage from "../pages/HelpPage";
import ForgotPassword from "../pages/ForgotPassword";
import UserGuide from "../pages/UserGuide";
import ContactPage from "../pages/ContactPage";
import EmissionFactorsPage from "../pages/admin/EmissionFactorsPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import TermsOfServicePage from "../pages/TermsOfServicePage"; // Correct import
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCompanyStore } from "../store/companyStore";
import FormalReportPage from "../pages/FormalReportPage";

export default function AppRoutes() {
  const { loggedIn } = useAuthStore();

  return (
    <Routes>
      {/* Public routes - NO header/sidebar */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Public static pages - NO header/sidebar */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} /> {/* Now using TermsOfServicePage */}

      {/* Protected routes - WITH header/sidebar */}
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        }
      />

      <Route
        path="/setup"
        element={
          <AppLayout>
            <CompanySetupPage />
          </AppLayout>
        }
      />

      <Route
        path="/scope1"
        element={
          <AppLayout>
            <Scope1Page />
          </AppLayout>
        }
      />

      <Route
        path="/scope2"
        element={
          <AppLayout>
            <Scope2Page />
          </AppLayout>
        }
      />

      <Route
        path="/reports"
        element={
          <AppLayout>
            <ReportsPage />
          </AppLayout>
        }
      />

      <Route 
       path="/reports/formal" 
       element={
        <AppLayout>
          <FormalReportPage  />
        </AppLayout>
        }
      />


      <Route
        path="/settings"
        element={
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        }
      />

      <Route
        path="/admin/factors"
        element={
          <AppLayout>
            <EmissionFactorsPage />
          </AppLayout>
        }
      />

      <Route
        path="/help"
        element={
          <AppLayout>
            <HelpPage />
          </AppLayout>
        }
      />

      <Route
        path="/guide"
        element={
          <AppLayout>
            <UserGuide />
          </AppLayout>
        }
      />

      <Route
        path="/contact"
        element={
          <AppLayout>
            <ContactPage />
          </AppLayout>
        }
      />
    </Routes>
  );
}