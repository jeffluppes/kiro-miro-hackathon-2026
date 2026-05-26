import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import './index.css'
import DiscoverPage from './pages/DiscoverPage'
import ReviewPage from './pages/ReviewPage'
import ResourcesPage from './pages/ResourcesPage'
import CasesPage from './pages/CasesPage'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <div>
      <nav className="app-nav">
        <NavLink to="/discover" className="app-nav-brand">
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <h1>SchoolGuard</h1>
        </NavLink>
        <div className="app-nav-links">
          <NavLink to="/discover" className={({ isActive }) => isActive ? 'active' : ''}>
            Discover
          </NavLink>
          <NavLink to="/resources" className={({ isActive }) => isActive ? 'active' : ''}>
            Resources
          </NavLink>
          <NavLink to="/cases" className={({ isActive }) => isActive ? 'active' : ''}>
            Cases
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => isActive ? 'active' : ''}>
            Report
          </NavLink>
        </div>
      </nav>

      <main className="page-container fade-in">
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/review/:profileId" element={<ReviewPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
