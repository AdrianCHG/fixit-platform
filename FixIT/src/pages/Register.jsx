import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registrarUsuario } from '../services/api'
import './Register.css'

function Register() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    contrasena: '',
    telefono: '',
    tipo_documento: 'DNI',
    nro_documento: ''
  })
  
  const [errores, setErrores] = useState({})
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    // 1. Validación para Nombre (Solo letras, espacios y tildes)
    if (name === 'nombre_completo') {
      const regexSoloLetras = /^[a-zA-ZÀ-ÿ\s]*$/
      if (!regexSoloLetras.test(value)) return
    }

    // 2. Validación para Teléfono (Solo números, máximo 9)
    if (name === 'telefono') {
      const regexSoloNumeros = /^[0-9]*$/
      if (!regexSoloNumeros.test(value) || value.length > 9) return
    }

    // 3. Validación dinámica para Documento
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
    
    if (errores[name]) {
      setErrores({ ...errores, [name]: '' })
    }
  }

  // Limpiar el número de documento si cambia el tipo (de DNI a CE)
  const handleTipoDocumentoChange = (event) => {
    setFormData({
      ...formData,
      tipo_documento: event.target.value,
      nro_documento: '' 
    })
    if (errores.nro_documento) {
      setErrores({ ...errores, nro_documento: '' })
    }
  }

  function validarFormulario() {
    const nuevosErrores = {}
    
    if (!formData.nombre_completo.trim()) nuevosErrores.nombre_completo = 'El nombre es obligatorio'
    if (!formData.correo.trim()) nuevosErrores.correo = 'El correo es obligatorio'
    if (!formData.contrasena) nuevosErrores.contrasena = 'La contraseña es obligatoria'
    if (!formData.telefono.trim()) nuevosErrores.telefono = 'El teléfono es obligatorio'
    if (!formData.nro_documento.trim()) nuevosErrores.nro_documento = 'El número de documento es obligatorio'

    setErrores(nuevosErrores)
    
    return Object.keys(nuevosErrores).length === 0
  }

  const manejarRegistro = async (event) => {
    event.preventDefault()
    setMensajeExito('')
    setMensajeError('')

    if (!validarFormulario()) {
      return
    }

    setCargando(true)

    const payloadUsuario = {
      nombre_completo: formData.nombre_completo.trim(),
      correo: formData.correo.trim(),
      contrasena: formData.contrasena,
      telefono: formData.telefono.trim(),
      tipo_documento: formData.tipo_documento,
      nro_documento: formData.nro_documento.trim()
    }

    try {
      await registrarUsuario(payloadUsuario)

      setMensajeExito('¡Cuenta creada con éxito! Redirigiendo al login...')

      setFormData({
        nombre_completo: '',
        correo: '',
        contrasena: '',
        telefono: '',
        tipo_documento: 'DNI',
        nro_documento: ''
      })

      // Redirigir al login después de 1.5 segundos para que el usuario lea el mensaje
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)

    } catch (error) {
      console.error('Error al registrar usuario:', error)
      setMensajeError(error.message || 'No se pudo crear la cuenta.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="auth-tabs">
          <Link 
            to="/login" 
            className="tab-inactive" 
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Iniciar Sesión
          </Link>
          
          <Link 
            to="/register" 
            className="tab-active" 
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Crear Cuenta
          </Link>
        </div>

        {/* FORMULARIO DE REGISTRO */}
        <form onSubmit={manejarRegistro} className="auth-form">
          {mensajeExito && (
            <div className="success-message" style={{ color: 'green', backgroundColor: '#d1fae5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
              {mensajeExito}
            </div>
          )}

          {mensajeError && (
            <div className="error-message" style={{ color: 'red', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
              {mensajeError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="nombre_completo">Nombre completo</label>
            <input
              id="nombre_completo"
              type="text"
              name="nombre_completo"
              placeholder="Ej. Juan Pérez"
              value={formData.nombre_completo}
              onChange={handleChange}
              className={errores.nombre_completo ? 'input-error' : ''}
              required
            />
            {errores.nombre_completo && <span className="error-text">{errores.nombre_completo}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="correo">Correo electrónico</label>
            <input
              id="correo"
              type="email"
              name="correo"
              placeholder="ejemplo@correo.com"
              value={formData.correo}
              onChange={handleChange}
              className={errores.correo ? 'input-error' : ''}
              required
            />
            {errores.correo && <span className="error-text">{errores.correo}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              name="contrasena"
              placeholder="••••••••"
              value={formData.contrasena}
              onChange={handleChange}
              className={errores.contrasena ? 'input-error' : ''}
              required
            />
            {errores.contrasena && <span className="error-text">{errores.contrasena}</span>}
          </div>

          {/* FILA COMPARTIDA (TIPO Y NRO DOC) */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tipo_documento">Tipo Doc.</label>
              <select id="tipo_documento" name="tipo_documento" value={formData.tipo_documento} onChange={handleTipoDocumentoChange}>
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="nro_documento">Número de documento</label>
              <input
                id="nro_documento"
                type="text"
                name="nro_documento"
                placeholder={formData.tipo_documento === 'DNI' ? 'Ej. 71234567' : 'Ej. 000123456'}
                value={formData.nro_documento}
                onChange={handleChange}
                className={errores.nro_documento ? 'input-error' : ''}
                required
              />
              {errores.nro_documento && <span className="error-text">{errores.nro_documento}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              type="tel"
              name="telefono"
              placeholder="Ej. 987654321"
              value={formData.telefono}
              onChange={handleChange}
              className={errores.telefono ? 'input-error' : ''}
              required
            />
            {errores.telefono && <span className="error-text">{errores.telefono}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={cargando}>
            {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Register