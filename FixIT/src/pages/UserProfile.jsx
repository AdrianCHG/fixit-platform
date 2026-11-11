import { useState, useEffect } from 'react'
import './UserProfile.css'
import { obtenerUsuarioActual, actualizarUsuario } from '../services/api'

function UserProfile() {
  const [seccionActiva, setSeccionActiva] = useState('perfil')

  // ESTADOS DEL FORMULARIO AMPLIADO CON DIRECCIÓN Y COORDENADAS
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo: '',
    telefono: '',
    tipo_documento: 'DNI',
    nro_documento: '',
    distrito_id: '',
    calle: '',
    referencia: '',
    latitud: null,
    longitud: null
  })

  const [passwordData, setPasswordData] = useState({ actual: '', nueva: '', confirmar: '' })
  
  const [distritos, setDistritos] = useState([])
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoUsuario, setCargandoUsuario] = useState(true)

  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  useEffect(() => {
    let activo = true

    async function inicializarDatos() {
      try {
        // 1. Cargar Distritos para el select
        const resDistritos = await fetch(`${rawApiUrl}/distritos`)
        if (resDistritos.ok) {
          const dataDistritos = await resDistritos.json()
          if (activo) setDistritos(dataDistritos.data || dataDistritos)
        }

        // 2. Cargar Usuario Actual
        const resultado = await obtenerUsuarioActual()
        console.log("Respuesta de obtenerUsuarioActual:", resultado)
        
        const usuario =
          resultado?.data?.usuario ??
          resultado?.data?.user ??
          resultado?.usuario ??
          resultado?.user ??
          resultado?.data ??
          resultado

        if (!usuario || typeof usuario !== 'object') {
          throw new Error('No se encontraron los datos del usuario.')
        }

        if (activo) {
          setFormData({
            nombre_completo: usuario.nombre_completo || usuario.nombre || '',
            correo: usuario.correo || usuario.email || '',
            telefono: usuario.telefono || '',
            tipo_documento: usuario.tipo_documento || 'DNI',
            nro_documento: usuario.nro_documento || usuario.numero_documento || '',
            // Mapeo de dirección y coordenadas
            distrito_id: usuario.distrito_id || usuario.direccion?.distrito_id || '',
            calle: usuario.calle || usuario.direccion?.calle || '',
            referencia: usuario.referencia || usuario.direccion?.referencia || '',
            latitud: usuario.latitud || usuario.direccion?.latitud || null,
            longitud: usuario.longitud || usuario.direccion?.longitud || null
          })
          setMensajeError('')
        }
      } catch (error) {
        console.error('Error al inicializar:', error)
        if (activo) {
          setMensajeError(error.message || 'No se pudieron cargar tus datos.')
        }
      } finally {
        if (activo) setCargandoUsuario(false)
      }
    }

    inicializarDatos()
    
    return () => { 
      activo = false 
    }
  }, [rawApiUrl])

  // AUTO-SCROLL HACIA ARRIBA EN EL CONTENEDOR DEL FORMULARIO
  useEffect(() => {
    if (mensajeExito) {
      // Buscamos el contenedor que tiene el scroll interno y lo subimos
      const cardContainer = document.querySelector('.dashboard-card')
      if (cardContainer) {
        cardContainer.scrollTo({ top: 0, behavior: 'smooth' })
      }
      // O si el scroll lo maneja otra clase contenedora de la vista principal:
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [mensajeExito])

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'nombre_completo' && !/^[a-zA-ZÀ-ÿ\s]*$/.test(value)) return
    if (name === 'telefono' && (!/^[0-9]*$/.test(value) || value.length > 9)) return
    
    if (name === 'nro_documento') {
      if (formData.tipo_documento === 'DNI' && (!/^[0-9]*$/.test(value) || value.length > 8)) return
      if (formData.tipo_documento === 'CE' && (!/^[a-zA-Z0-9]*$/.test(value) || value.length > 11)) return
    }
    
    if (name === 'tipo_documento') {
      setFormData({ ...formData, tipo_documento: value, nro_documento: '' })
      setMensajeExito('')
      return
    }

    setFormData({ ...formData, [name]: value })
    setMensajeExito('')
  }

  // --- FUNCIÓN PARA CAPTURAR GEOLOCALIZACIÓN ---
  const capturarUbicacion = () => {
    if (!navigator.geolocation) {
      setMensajeError('Tu navegador no soporta geolocalización.')
      return
    }

    setMensajeExito('Obteniendo ubicación...')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }))
        setMensajeExito('¡Coordenadas capturadas con éxito!')
      },
      (error) => {
        console.error("Error GPS:", error)
        setMensajeError('No se pudo obtener la ubicación. Asegúrate de darle permisos al navegador.')
      },
      { enableHighAccuracy: true } // Pide la mayor precisión posible
    )
  }

  const validarFormulario = () => {
    const { nombre_completo, telefono, nro_documento, calle, distrito_id } = formData

    if (nombre_completo.trim().length < 3) return 'Ingresa tu nombre completo.'
    if (formData.tipo_documento === 'DNI' && !/^\d{8}$/.test(nro_documento)) return 'El DNI debe contener 8 dígitos.'
    if (formData.tipo_documento === 'CE' && !/^[a-zA-Z0-9]{9,11}$/.test(nro_documento)) return 'El CE debe tener entre 9 y 11 caracteres.'
    if (!/^9\d{8}$/.test(telefono)) return 'El celular debe tener 9 dígitos y comenzar con 9.'
    
    // Validación de dirección
    if (!distrito_id) return 'Debes seleccionar un distrito de residencia.'
    if (calle.trim().length < 5) return 'Ingresa una dirección o calle válida.'

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
      const payload = {
        nombre_completo: formData.nombre_completo.trim(),
        telefono: formData.telefono.trim(),
        tipo_documento: formData.tipo_documento,
        nro_documento: formData.nro_documento.trim(),
        distrito_id: formData.distrito_id,
        calle: formData.calle.trim(),
        referencia: formData.referencia.trim(),
        latitud: formData.latitud, // Enviamos latitud
        longitud: formData.longitud // Enviamos longitud
      }

      await actualizarUsuario(payload)
      setMensajeExito('¡Tus datos y dirección se actualizaron correctamente!')
    } catch (error) {
      console.error('Error al actualizar:', error)
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
            type="button" 
            className={`sidebar-link ${seccionActiva === 'perfil' ? 'active' : ''}`} 
            onClick={() => { setSeccionActiva('perfil'); setMensajeExito(''); setMensajeError(''); }}
          >
            👤 Información Personal
          </button>
          <button 
            type="button" 
            className={`sidebar-link ${seccionActiva === 'seguridad' ? 'active' : ''}`} 
            onClick={() => { setSeccionActiva('seguridad'); setMensajeExito(''); setMensajeError(''); }}
          >
            🔒 Seguridad y Contraseña
          </button>
          <button 
            type="button" 
            className={`sidebar-link ${seccionActiva === 'pagos' ? 'active' : ''}`} 
            onClick={() => { setSeccionActiva('pagos'); setMensajeExito(''); setMensajeError(''); }}
          >
            💳 Métodos de Pago
          </button>
          <button 
            type="button" 
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
            <p role="status">Cargando tu información personal...</p>
          </div>
        ) : (
          <>
            {/* VISTA 1: INFORMACIÓN PERSONAL */}
            {seccionActiva === 'perfil' && (
              <div className="dashboard-card fade-in">
                <div className="dashboard-header">
                  <h2>Información Personal y Ubicación</h2>
                  <p>Actualiza tus datos y tu dirección para encontrar técnicos cercanos.</p>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                  {mensajeExito && <div className="success-message" role="status">{mensajeExito}</div>}
                  {mensajeError && <div className="error-message" role="alert">{mensajeError}</div>}

                  {/* SECCIÓN: DATOS PERSONALES */}
                  <div className="form-group">
                    <label htmlFor="nombre_completo_input">Nombre completo</label>
                    <input
                      id="nombre_completo_input"
                      type="text"
                      name="nombre_completo"
                      value={formData.nombre_completo}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="correo_input">Correo electrónico</label>
                    <input
                      id="correo_input"
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
                      <label htmlFor="tipo_documento_select">Tipo Doc.</label>
                      <select id="tipo_documento_select" name="tipo_documento" value={formData.tipo_documento} onChange={handleChange}>
                        <option value="DNI">DNI</option>
                        <option value="CE">CE</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="nro_documento_input">Número de documento</label>
                      <input
                        id="nro_documento_input"
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
                    <label htmlFor="telefono_input">Teléfono Celular</label>
                    <input
                      id="telefono_input"
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

                  {/* NUEVA SECCIÓN: DIRECCIÓN DE ATENCIÓN */}
                  <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.1rem', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                    Dirección de Atención
                  </h3>

                  <div className="form-group">
                    <label htmlFor="distrito_id">Distrito</label>
                    <select id="distrito_id" name="distrito_id" value={formData.distrito_id} onChange={handleChange} required>
                      <option value="">Selecciona tu distrito...</option>
                      {distritos.map(distrito => (
                        <option key={distrito.id} value={distrito.id}>
                          {distrito.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="calle">Dirección / Calle / Avenida</label>
                    <input 
                      id="calle" 
                      type="text" 
                      name="calle" 
                      value={formData.calle} 
                      onChange={handleChange} 
                      required 
                      placeholder="Ej. Av. Larco 123, Dpto 402" 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="referencia">Referencia (Opcional)</label>
                    <input 
                      id="referencia" 
                      type="text" 
                      name="referencia" 
                      value={formData.referencia} 
                      onChange={handleChange} 
                      placeholder="Ej. A dos cuadras del parque Kennedy" 
                    />
                  </div>

                  {/* SECCIÓN GEOLOCALIZACIÓN */}
                  <div className="form-group" style={{ marginTop: '1rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                    <label>Coordenadas del domicilio (Opcional pero recomendado)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn-secundario" 
                        onClick={capturarUbicacion}
                        style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                      >
                        📍 Obtener mi ubicación actual
                      </button>
                      <span style={{ fontSize: '0.85rem', color: formData.latitud ? '#10b981' : '#6b7280', fontWeight: formData.latitud ? '600' : 'normal' }}>
                        {formData.latitud && formData.longitud 
                          ? `✓ Coordenadas guardadas: ${Number(formData.latitud).toFixed(5)}, ${Number(formData.longitud).toFixed(5)}` 
                          : 'Aún no has compartido tu ubicación exacta.'}
                      </span>
                    </div>
                  </div>

                  <div className="form-actions-right" style={{ marginTop: '1.5rem' }}>
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
                  <button type="button" className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => alert('Próximamente: Agregar pasarela de pagos')}>
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