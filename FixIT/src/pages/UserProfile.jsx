import { useState, useEffect } from 'react'
import './UserProfile.css'
import { obtenerUsuarioActual, actualizarUsuario } from '../services/api'

function UserProfile() {
  // Pestaña activa del menú lateral ('perfil', 'seguridad', 'pagos', 'notificaciones')
  const [seccionActiva, setSeccionActiva] = useState('perfil')

  // ESTADOS DEL FORMULARIO
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    telefono: '',
    tipo_documento: 'DNI',
    nro_documento: ''
  })

  // Estados para simular cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  })

  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoUsuario, setCargandoUsuario] = useState(true)

  useEffect(() => {
    let activo = true

    async function cargarUsuario() {
      try {
        const resultado = await obtenerUsuarioActual()

        const usuario =
          resultado?.data?.usuario ??
          resultado?.data?.user ??
          resultado?.data

        if (!usuario) {
          throw new Error('No se encontraron los datos del usuario.')
        }

        if (activo) {
          setFormData({
            nombre_completo: usuario.nombre_completo || '',
            correo: usuario.correo || '',
            telefono: usuario.telefono || '',
            tipo_documento: usuario.tipo_documento || 'DNI',
            nro_documento: usuario.nro_documento || '',
          })
          setMensajeError('')
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error)
        if (activo) {
          setMensajeError(error.message || 'No se pudieron cargar tus datos.')
        }
      } finally {
        if (activo) {
          setCargandoUsuario(false)
        }
      }
    }

    cargarUsuario()

    return () => {
      activo = false
    }
  }, [])

  // MANEJADORES DE EVENTOS CON RESTRICCIONES DE ENTRADA
  const handleChange = (event) => {
    const { name, value } = event.target

    // 1. Validar Nombre: Solo letras, acentos y espacios
    if (name === 'nombre_completo') {
      const soloLetras = /^[a-zA-ZÀ-ÿ\s]*$/
      if (!soloLetras.test(value)) return
    }

    // 2. Validar Teléfono: Solo números, máximo 9 dígitos, debe empezar con 9
    if (name === 'telefono') {
      const soloNumeros = /^[0-9]*$/
      if (!soloNumeros.test(value) || value.length > 9) return
    }

    // 3. Validar Número de Documento según el tipo seleccionado
    if (name === 'nro_documento') {
      if (formData.tipo_documento === 'DNI') {
        const soloNumeros = /^[0-9]*$/
        if (!soloNumeros.test(value) || value.length > 8) return
      } else if (formData.tipo_documento === 'CE') {
        const alfanumerico = /^[a-zA-Z0-9]*$/
        if (!alfanumerico.test(value) || value.length > 11) return
      }
    }

    // Si cambia el tipo de documento, limpiamos el número para evitar conflictos de longitud
    if (name === 'tipo_documento') {
      setFormData({
        ...formData,
        tipo_documento: value,
        nro_documento: ''
      })
      setMensajeExito('')
      return
    }

    setFormData({
      ...formData,
      [name]: value
    })
    setMensajeExito('')
  }

  const validarFormulario = () => {
    const nombre = formData.nombre_completo.trim()
    const telefono = formData.telefono.trim()
    const documento = formData.nro_documento.trim()

    if (nombre.length < 3) {
      return 'Ingresa tu nombre completo.'
    }

    if (formData.tipo_documento === 'DNI') {
      if (!/^\d{8}$/.test(documento)) {
        return 'El DNI debe contener exactamente 8 dígitos.'
      }
    } else if (formData.tipo_documento === 'CE') {
      if (!/^[a-zA-Z0-9]{9,11}$/.test(documento)) {
        return 'El CE debe contener entre 9 y 11 caracteres alfanuméricos.'
      }
    }

    if (!/^9\d{8}$/.test(telefono)) {
      return 'El celular debe tener 9 dígitos y comenzar con 9.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      setMensajeExito('')
      setMensajeError(errorValidacion)
      return
    }

    setCargando(true)
    setMensajeExito('')
    setMensajeError('')

    try {
      const resultado = await actualizarUsuario({
        nombre_completo: formData.nombre_completo.trim(),
        telefono: formData.telefono.trim(),
        tipo_documento: formData.tipo_documento,
        nro_documento: formData.nro_documento.trim(),
      })

      const usuarioActualizado = resultado?.data

      if (usuarioActualizado) {
        setFormData((anterior) => ({
          ...anterior,
          nombre_completo: usuarioActualizado.nombre_completo ?? anterior.nombre_completo,
          correo: usuarioActualizado.correo ?? anterior.correo,
          telefono: usuarioActualizado.telefono ?? '',
          tipo_documento: usuarioActualizado.tipo_documento ?? anterior.tipo_documento,
          nro_documento: usuarioActualizado.nro_documento ?? '',
        }))
      }

      setMensajeExito('¡Tus datos se actualizaron correctamente!')
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      setMensajeError(error.message || 'No se pudieron actualizar los datos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="dashboard-container">
      
      {/* BARRA LATERAL (SIDEBAR DEL USUARIO) */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">
            {formData.nombre_completo ? formData.nombre_completo.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="sidebar-names">
            <h3>{formData.nombre_completo ? formData.nombre_completo.split(' ')[0] : 'Usuario'}</h3>
            <span>Miembro desde 2026</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-link ${seccionActiva === 'perfil' ? 'active' : ''}`}
            onClick={() => { setSeccionActiva('perfil'); setMensajeExito(''); setMensajeError(''); }}
          >
            👤 Información Personal
          </button>
          <button 
            className={`sidebar-link ${seccionActiva === 'seguridad' ? 'active' : ''}`}
            onClick={() => { setSeccionActiva('seguridad'); setMensajeExito(''); setMensajeError(''); }}
          >
            🔒 Seguridad y Contraseña
          </button>
          <button 
            className={`sidebar-link ${seccionActiva === 'pagos' ? 'active' : ''}`}
            onClick={() => { setSeccionActiva('pagos'); setMensajeExito(''); setMensajeError(''); }}
          >
            💳 Métodos de Pago
          </button>
          <button 
            className={`sidebar-link ${seccionActiva === 'notificaciones' ? 'active' : ''}`}
            onClick={() => { setSeccionActiva('notificaciones'); setMensajeExito(''); setMensajeError(''); }}
          >
            🔔 Notificaciones
          </button>
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL DINÁMICA SEGÚN LA PESTAÑA */}
      <main className="dashboard-main">
        {cargandoUsuario ? (
          <div className="dashboard-card">
            <p>Cargando tu información personal...</p>
          </div>
        ) : (
          <>
            {/* VISTA 1: INFORMACIÓN PERSONAL */}
            {seccionActiva === 'perfil' && (
              <div className="dashboard-card fade-in">
                <div className="dashboard-header">
                  <h2>Información Personal</h2>
                  <p>Actualiza tus datos personales y cómo te contactaremos.</p>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                  {mensajeExito && <div className="success-message" role="status">{mensajeExito}</div>}
                  {mensajeError && <div className="error-message" role="alert">{mensajeError}</div>}

                  <div className="form-group">
                    <label>Nombre completo</label>
                    <input
                      type="text"
                      name="nombre_completo"
                      value={formData.nombre_completo}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Correo electrónico</label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      disabled 
                      className="input-disabled"
                    />
                    <small className="form-hint">El correo electrónico no se puede cambiar ya que está vinculado a tu cuenta.</small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo Doc.</label>
                      <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange}>
                        <option value="DNI">DNI</option>
                        <option value="CE">CE</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Número de documento</label>
                      <input
                        type="text"
                        name="nro_documento"
                        value={formData.nro_documento}
                        onChange={handleChange}
                        required 
                        maxLength={formData.tipo_documento === 'DNI' ? 8 : 11}
                        inputMode={formData.tipo_documento === 'DNI' ? 'numeric' : 'text'}
                        placeholder={formData.tipo_documento === 'DNI' ? '8 dígitos' : '9 a 11 caracteres'}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Teléfono Celular</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      required
                      maxLength={9}
                      inputMode="numeric"
                      placeholder="9XXXXXXXX"
                    />
                  </div>

                  <div className="form-actions-right">
                    <button type="submit" className="btn-primary" disabled={cargando}>
                      {cargando ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* VISTA 2: SEGURIDAD Y CONTRASEÑA */}
            {seccionActiva === 'seguridad' && (
              <div className="dashboard-card fade-in">
                <div className="dashboard-header">
                  <h2>Seguridad y Contraseña</h2>
                  <p>Administra tu contraseña y la seguridad de tu acceso.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                  <div className="form-group">
                    <label>Contraseña Actual</label>
                    <input type="password" placeholder="••••••••" value={passwordData.actual} onChange={(e) => setPasswordData({...passwordData, actual: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Nueva Contraseña</label>
                    <input type="password" placeholder="Mínimo 8 caracteres" value={passwordData.nueva} onChange={(e) => setPasswordData({...passwordData, nueva: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Confirmar Nueva Contraseña</label>
                    <input type="password" placeholder="Repite la nueva contraseña" value={passwordData.confirmar} onChange={(e) => setPasswordData({...passwordData, confirmar: e.target.value})} />
                  </div>
                  <div className="form-actions-right">
                    <button type="button" className="btn-primary" onClick={() => alert('Funcionalidad de cambio de contraseña en desarrollo')}>
                      Actualizar Contraseña
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 3: MÉTODOS DE PAGO */}
            {seccionActiva === 'pagos' && (
              <div className="dashboard-card fade-in">
                <div className="dashboard-header">
                  <h2>Métodos de Pago</h2>
                  <p>Administra tus tarjetas y métodos preferidos para contrataciones.</p>
                </div>
                <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7280' }}>
                  <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</p>
                  <p>No tienes métodos de pago registrados actualmente.</p>
                  <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => alert('Próximamente: Agregar pasarela de pagos')}>
                    + Agregar Tarjeta
                  </button>
                </div>
              </div>
            )}

            {/* VISTA 4: NOTIFICACIONES */}
            {seccionActiva === 'notificaciones' && (
              <div className="dashboard-card fade-in">
                <div className="dashboard-header">
                  <h2>Preferencias de Notificaciones</h2>
                  <p>Elige cómo y cuándo deseas recibir alertas sobre tus servicios.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: '#374151' }}>
                    <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                    Notificaciones por correo electrónico (actualizaciones de estado)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: '#374151' }}>
                    <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                    Alertas vía SMS / WhatsApp sobre la llegada del técnico
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: '#374151' }}>
                    <input type="checkbox" style={{ width: '18px', height: '18px' }} />
                    Ofertas promocionales y boletines de FixIT
                  </label>
                  <div className="form-actions-right" style={{ marginTop: '1rem' }}>
                    <button type="button" className="btn-primary" onClick={() => alert('Preferencias guardadas exitosamente')}>
                      Guardar Preferencias
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

    </div>
  )
}

export default UserProfile