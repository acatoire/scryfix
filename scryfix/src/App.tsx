import { HashRouter, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import ReportHome from './pages/ReportHome'
import ReportView from './pages/ReportView'
import StatsDashboard from './pages/StatsDashboard'
import './App.css'

function App() {
  return (
    <HashRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<ReportHome />} />
        <Route path="/stats" element={<StatsDashboard />} />
        <Route path="/report" element={<ReportView />} />
      </Routes>
    </HashRouter>
  )
}

export default App
