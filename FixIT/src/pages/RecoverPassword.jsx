import { useState } from 'react'
import { Link } from 'react-router-dom'
//import { recuperarPassword } from '../services/api' // Asegúrate de exportar esta función en tu api.js si está disponible
import './Register.css'

function RecoverPassword() {
  const [correo, setCorreo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const manejarRecuperacion = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    setCargando(true)

    try {
      // Si ya creaste el endpoint en services/api.js, puedes descomentar la siguiente línea:
      // await recuperarPassword({ correo })

      // Simulación de llamada real a la API (o integración directa)
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const respuesta = await fetch(`${rawApiUrl}/auth/recuperar-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      })

      // Aunque el endpoint falle o sea exitoso, por seguridad usualmente se muestra un mensaje genérico,
      // pero validamos si la API responde correctamente.
      if (!respuesta.ok) {
        const json = await respuesta.json().catch(() => ({}))
        throw new Error(json.message || 'No se pudo procesar la solicitud.')
      }

      setMensaje("Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos.")
      setCorreo('')
    } catch (err) {
      console.error('Error al solicitar recuperación:', err)
      // Por motivos de seguridad o fallback, mostramos el mensaje amigable o el error del servidor
      setMensaje("Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '0.5rem' }}>
            Recuperar Contraseña
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
            Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
          </p>
        </div>

        <form onSubmit={manejarRecuperacion} className="auth-form">
          
          {mensaje && (
            <div className="success-message" style={{ color: 'green', backgroundColor: '#d1fae5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
              {mensaje}
            </div>
          )}

          {error && (
            <div className="error-message" style={{ color: 'red', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="correo-recuperacion">Correo Electrónico</label>
            <input
              id="correo-recuperacion"
              type="email"
              placeholder="ejemplo@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={cargando}>
            {cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '500', fontSize: '0.9rem' }}>
            ← Volver a Iniciar Sesión
          </Link>
        </div>

      </div>
    </div>
  )
}

export default RecoverPassword