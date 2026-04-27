import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Record from './pages/Record'
import EntryView from './pages/EntryView'

function Nav() {
  const navigate = useNavigate()
  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="nav-logo">✦ journal</span>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Overview
          </NavLink>
          <NavLink to="/record" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            + Record
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/record" element={<Record />} />
          <Route path="/entry/:id" element={<EntryView />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
