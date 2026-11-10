import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from "./pages/Home"
import Technicians from './pages/Technicians'
import Login from './pages/Login'
import Register from './pages/Register'
import RegistrarIncidencia from './pages/RegistrarIncidencia'
import Triaje from './pages/Triaje'
import ResultadoDiagnostico from './pages/ResultadoDiagnostico'
import TechnicianProfile from './pages/TechnicianProfile'
import RecoverPassword from "./pages/RecoverPassword";
import UserProfile from './pages/UserProfile'
import DashboardCliente from './pages/DashboardCliente'
import DetalleIncidencia from './pages/DetalleIncidencia'
import ReservarServicio from './pages/ReservarServicio'
import Help from './pages/Help'
import RegistroTecnico from './pages/RegistroTecnico'
import DashboardTecnico from './pages/DashboardTecnico'

function MainLayout() {
  const location = useLocation()
  
  const esDashboardTecnico = location.pathname.includes('/dashboard-tecnico')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {!esDashboardTecnico && <Navbar />}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Home />}/>
          <Route path="/technicians" element={<Technicians />} />
          <Route path="/login" element={<Login />}/>
          <Route path="/register" element={<Register />} />
          <Route path="/registrar-incidencia" element={<RegistrarIncidencia />} />
          <Route path="/triaje" element={<Triaje />} />
          <Route path="/resultado-diagnostico" element={<ResultadoDiagnostico />} />
          <Route path="/technician/:id" element={<TechnicianProfile />} />
          <Route path="/reservar/:tecnicoId" element={<ReservarServicio />} />
          <Route path="/recuperar-password" element={<RecoverPassword />} />
          <Route path="/mi-cuenta" element={<UserProfile />} />
          <Route path="/dashboard-cliente" element={<DashboardCliente />} />
          <Route path="/incidencias/:id" element={<DetalleIncidencia />} />
          <Route path="/help" element={<Help />} />
          <Route path="/registro-tecnico" element={<RegistroTecnico />} />
          <Route path="/dashboard-tecnico" element={<DashboardTecnico />} />
        </Routes>
      </main>

      {!esDashboardTecnico && <Footer />}

    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  )
}

export default App