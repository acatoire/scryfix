import { NavLink } from 'react-router-dom'
import './NavBar.css'

function NavBar() {
  return (
    <nav className="nav-bar">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-bar-active' : undefined)}>
        Report an issue
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => (isActive ? 'nav-bar-active' : undefined)}>
        Stats dashboard
      </NavLink>
    </nav>
  )
}

export default NavBar
