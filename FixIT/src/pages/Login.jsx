import { useState } from 'react'
import { iniciarSesion } from '../services/api'
import { Link, useNavigate } from 'react-router-dom'
import './Register.css'

function Login() {
  const navigate = useNavigate()

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  // MANEJADORES DE EVENTOS
  const manejarLogin = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')

    try {
      const resultado = await iniciarSesion({
        correo,
        contrasena
      })

      // 1. Guardar el token de seguridad
      localStorage.setItem('fixit_token', resultado.data.token)
      
      // 2. Guardar los datos del usuario (muy útil para mostrar su nombre en el Navbar)
      localStorage.setItem('fixit_user', JSON.stringify(resultado.data.user))

      setMensajeExito('¡Inicio de sesión exitoso! Redirigiendo...')

      // 3. Redirección basada en el ROL del usuario
      setTimeout(() => {
        const rolUsuario = String(resultado.data.user.rol).toUpperCase()

        if (rolUsuario === 'TECNICO') {
          navigate('/dashboard-tecnico')
        } else if (rolUsuario === 'ADMIN') {
          navigate('/dashboard-admin') // Preparado para tu siguiente fase
        } else {
          navigate('/dashboard-cliente') // Por defecto es cliente
        }
      }, 1500) // Pequeña pausa de 1.5s para que el usuario lea el mensaje de éxito

    } catch (err) {
      console.error('Error al iniciar sesión:', err)
      setError(err.message || 'Correo o contraseña incorrectos.')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="auth-tabs">
          <Link to="/login" className="tab-active" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Iniciar Sesión
          </Link>
          <Link to="/register" className="tab-inactive" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Crear Cuenta
          </Link>
        </div>

        {/* FORMULARIO DE INGRESO */}
        <form onSubmit={manejarLogin} className="auth-form">

          {/* MENSAJES DE ERROR Y ÉXITO */}
          {error && <div className="error-message" style={{ color: 'red', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
          {mensajeExito && <div className="success-message" style={{ color: 'green', backgroundColor: '#d1fae5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>{mensajeExito}</div>}

          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </div>

          {/* OPCIONES ADICIONALES */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', margin: '0.5rem 0 1.5rem' }}>
            <label style={{ color: '#6B7280', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" /> Recordarme
            </label>

            <Link to="/recuperar-password" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '500' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="btn-primary">
            Iniciar Sesión
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#4B5563' }}>
            ¿Eres especialista técnico?{' '}
            <Link to="/registro-tecnico" style={{ color: '#2563EB', fontWeight: '600', textDecoration: 'none' }}>
              Regístrate como técnico aquí
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Login