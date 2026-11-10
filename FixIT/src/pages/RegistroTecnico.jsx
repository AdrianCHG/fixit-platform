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
    setError('')
    setMensajeExito('')

    const dataToSend = new FormData()
    Object.keys(formData).forEach((key) => {
      dataToSend.append(key, formData[key])
    })

    try {
      const respuesta = await fetch('http://localhost:3000/api/auth/registro-tecnico', {
        method: 'POST',
        body: dataToSend
      })

      const data = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(data.message || 'No se pudo completar el registro.')
      }

      setMensajeExito('¡Registro exitoso! Tu cuenta está pendiente de aprobación por el administrador.')
      
      // 🚩 MAGIA AQUÍ: Sube la pantalla automáticamente hacia arriba para que vea el mensaje
      window.scrollTo({ top: 0, behavior: 'smooth' })

      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message)
      // Si hay error también sube la pantalla para que lo vea
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <label>Nombre y Apellidos</label>
            <input
              type="text"
              name="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div className="form-group">
            <label>Correo Electrónico Profesional</label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Teléfono / Celular</label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej: 999111222"
                required
              />
            </div>
            <div className="form-group">
              <label>Años de Experiencia</label>
              <input
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
              <label>Tipo Doc.</label>
              <select
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
              <label>Número de Documento</label>
              <input
                type="text"
                name="nro_documento"
                value={formData.nro_documento}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tarifa Hora Mínima (S/)</label>
              <input
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
              <label>Tarifa Hora Máxima (S/)</label>
              <input
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
            <label>Foto de Perfil (Avatar)</label>
            <input
              type="file"
              name="avatar"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Breve Biografía / Especialidades</label>
            <textarea
              name="biografia"
              rows="3"
              value={formData.biografia}
              onChange={handleChange}
              placeholder="Ej: Especialista en redes, mantenimiento de hardware..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }}
              required
            ></textarea>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Enviar Postulación como Técnico
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