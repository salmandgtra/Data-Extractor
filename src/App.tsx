import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthSuccess from './pages/AuthSuccess'
import Dashboard from './pages/Dashboard'
import HubsDashboard from './pages/Hubs/HubsDashboard'
import LoginPage from './pages/LoginPage'
import ProjectDashboard from './pages/Projects/ProjectDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                         element={<LoginPage />} />
        <Route path="/auth/success"             element={<AuthSuccess />} />
        <Route path="/hubs"                     element={<HubsDashboard />} />
        <Route path="/hubs/:hubId/projects"     element={<ProjectDashboard />} />
        <Route path="/dashboard"                element={<Dashboard />} />
        {/* Catch-all → login */}
        <Route path="*"                         element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}
