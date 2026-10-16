import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agencies from "./pages/Agencies";
import Drivers from "./pages/Drivers";
import Duties from "./pages/Duties";
import Financial from "./pages/Financial";
import Documents from "./pages/Documents";
import Support from "./pages/Support";
import Complaints from "./pages/Complaints";
import Broadcast from "./pages/Broadcast";
import Users from "./pages/Users";
import Security from "./pages/Security";
import Permissions from "./pages/Permissions";
import VehicleTypes from "./pages/VehicleTypes";
import AppVersions from "./pages/AppVersions";
import Settings from "./pages/Settings";
import Activity from "./pages/Activity";

export default function App() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="agencies" element={<Agencies />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="duties" element={<Duties />} />
        <Route path="financial" element={<Financial />} />
        <Route path="documents" element={<Documents />} />
        <Route path="support" element={<Support />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="broadcast" element={<Broadcast />} />
        <Route path="users" element={<Users />} />
        <Route path="security" element={<Security />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="vehicle-types" element={<VehicleTypes />} />
        <Route path="app-versions" element={<AppVersions />} />
        <Route path="settings" element={<Settings />} />
        <Route path="activity" element={<Activity />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
