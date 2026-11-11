import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './RegistroTecnico.css'

function RegistroTecnico() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    contrasena: '',
    telefono: '',
    anios_experiencia: '',
    tarifa_hora_min: '',
    tarifa_hora_max: '',
    tipo_documento: 'DNI',
    nro_documento: '',
    biografia: '',
    avatar: null
  })
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [enviando, setEnviando] = useState(false)

  // URL base dinámica para producción y desarrollo
  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const handleChange = (e) => {
    const { name, value, type, files } = e.target

    if (type === 'file') {
      setFormData({
        ...formData,
        [name]: files[0]
      })
      return
    }

    if (name === 'nombre_completo') {
      const regexSoloLetras = /^[a-zA-ZÀ-ÿ\s]*$/
      if (!regexSoloLetras.test(value)) return
    }

    if (name === 'telefono') {
      const regexSoloNumeros = /^[0-9]*$/
      if (!regexSoloNumeros.test(value) || value.length > 9) return
    }

    if (name === 'nro_documento') {
      if (formData.tipo_documento === 'DNI') {
        const regexDNI = /^[0-9]*$/
        if (!regexDNI.test(value) || value.length > 8) return
      } else {
        const regexAlfaNumerico = /^[a-zA-Z0-9]*$/
        if (!regexAlfaNumerico.test(value) || value.length > 12) return
      }
    }

    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleTipoDocumentoChange = (e) => {
    setFormData({
      ...formData,
      tipo_documento: e.target.value,
      nro_documento: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (enviando) return

    setError('')
    setMensajeExito('')
    setEnviando(true)

    const dataToSend = new FormData()
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null) {
        dataToSend.append(key, formData[key])
      }
    })

    try {
      const respuesta = await fetch(`${rawApiUrl}/auth/registro-tecnico`, {
        method: 'POST',
        body: dataToSend
      })

      const data = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo completar el registro.')
      }

      setMensajeExito('¡Registro exitoso! Tu cuenta está pendiente de aprobación por el administrador.')
      window.scrollTo({ top: 0, behavior: 'smooth' })

      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Error de conexión al registrar técnico.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="register-container">
      <div className="register-card" style={{ maxWidth: '600px' }}>
        <h2>Portal de Especialistas FixIT</h2>
        <p>Regístrate como técnico para ofrecer tus servicios en la plataforma.</p>

        {error && <div className="alert-error" style={{ color: 'red', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '8px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}
        {mensajeExito && <div className="alert-success" style={{ color: '#047857', marginBottom: '1rem', padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #34d399' }}>{mensajeExito}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="nombre_completo">Nombre y Apellidos</label>
            <input
              id="nombre_completo"
              type="text"
              name="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="correo">Correo Electrónico Profesional</label>
            <input
              id="correo"
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="telefono">Teléfono / Celular</label>
              <input
                id="telefono"
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej: 999111222"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="anios_experiencia">Años de Experiencia</label>
              <input
                id="anios_experiencia"
                type="number"
                min="0"
                name="anios_experiencia"
                value={formData.anios_experiencia}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="tipo_documento">Tipo Doc.</label>
              <select
                id="tipo_documento"
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleTipoDocumentoChange}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                required
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carné de Extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="nro_documento">Número de Documento</label>
              <input
                id="nro_documento"
                type="text"
                name="nro_documento"
                value={formData.nro_documento}
                onChange={handleChange}
                placeholder={formData.tipo_documento === 'DNI' ? 'Ej. 71234567' : 'Ej. 000123456'}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="tarifa_hora_min">Tarifa Hora Mínima (S/)</label>
              <input
                id="tarifa_hora_min"
                type="number"
                step="0.01"
                min="0"
                name="tarifa_hora_min"
                value={formData.tarifa_hora_min}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="tarifa_hora_max">Tarifa Hora Máxima (S/)</label>
              <input
                id="tarifa_hora_max"
                type="number"
                step="0.01"
                min="0"
                name="tarifa_hora_max"
                value={formData.tarifa_hora_max}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="avatar">Foto de Perfil (Avatar)</label>
            <input
              id="avatar"
              type="file"
              name="avatar"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="biografia">Breve Biografía / Especialidades</label>
            <textarea
              id="biografia"
              name="biografia"
              rows="3"
              value={formData.biografia}
              onChange={handleChange}
              placeholder="Ej: Especialista en redes, mantenimiento de hardware..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }}
              required
            ></textarea>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={enviando}>
            {enviando ? 'Enviando postulación...' : 'Enviar Postulación como Técnico'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </div>
    </main>
  )
}

export default RegistroTecnico