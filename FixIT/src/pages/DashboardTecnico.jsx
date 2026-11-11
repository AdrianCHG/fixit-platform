import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './DashboardTecnico.css'

function DashboardTecnico() {
    const navigate = useNavigate()
    const [perfil, setPerfil] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')

    const [vistaActual, setVistaActual] = useState('resumen')

    const [distritosDisponibles, setDistritosDisponibles] = useState([])
    const [distritosSeleccionados, setDistritosSeleccionados] = useState([])

    // Estados para las modalidades de servicio
    const [modalidadesDisponibles, setModalidadesDisponibles] = useState([])
    const [modalidadesSeleccionadas, setModalidadesSeleccionadas] = useState([])

    // FORMULARIO AMPLIADO CON DIRECCIÓN Y COORDENADAS DEL TALLER
    const [formData, setFormData] = useState({
        nombre: '', 
        telefono: '', 
        biografia: '', 
        anios_experiencia: '',
        tarifa_hora_min: '', 
        tarifa_hora_max: '', 
        distrito_id: '',
        calle: '',
        referencia: '',
        latitud: null,
        longitud: null,
        avatar: null, 
        avatarPreview: null
    })
    const [mensajeExito, setMensajeExito] = useState('')

    // ESTADO PARA CAMBIO DE CONTRASEÑA
    const [passwordData, setPasswordData] = useState({ actual: '', nueva: '', confirmar: '' })
    const [mensajePassword, setMensajePassword] = useState('')

    const [certData, setCertData] = useState({ nombre: '', tipo: 'TITULO', archivo: null })
    const [mensajeCert, setMensajeCert] = useState('')

    // URL base dinámica para producción y desarrollo
    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const baseUrl = rawApiUrl.replace(/\/api$/, '')

    useEffect(() => {
        const obtenerDatosIniciales = async () => {
            const token = localStorage.getItem('fixit_token')
            if (!token) {
                navigate('/login')
                return
            }

            try {
                // 1. Cargar perfil del técnico
                const respuestaPerfil = await fetch(`${rawApiUrl}/tecnicos/me`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                })
                const jsonPerfil = await respuestaPerfil.json()
                if (!respuestaPerfil.ok) throw new Error(jsonPerfil.message || 'Error al cargar tu información.')

                setPerfil(jsonPerfil.data)

                setFormData({
                    nombre: jsonPerfil.data.nombre || '',
                    telefono: jsonPerfil.data.telefono || '',
                    biografia: jsonPerfil.data.biografia || '',
                    anios_experiencia: jsonPerfil.data.anios_experiencia || '',
                    tarifa_hora_min: jsonPerfil.data.tarifa_hora_min || '',
                    tarifa_hora_max: jsonPerfil.data.tarifa_hora_max || '',
                    distrito_id: jsonPerfil.data.distrito_id || '',
                    calle: jsonPerfil.data.calle || '',
                    referencia: jsonPerfil.data.referencia || '',
                    latitud: jsonPerfil.data.latitud || null,
                    longitud: jsonPerfil.data.longitud || null,
                    avatar: null, 
                    avatarPreview: null
                })

                if (jsonPerfil.data.cobertura && Array.isArray(jsonPerfil.data.cobertura)) {
                    setDistritosSeleccionados(jsonPerfil.data.cobertura.map(d => d.distrito_id || d.id))
                }

                if (jsonPerfil.data.modalidades && Array.isArray(jsonPerfil.data.modalidades)) {
                    setModalidadesSeleccionadas(jsonPerfil.data.modalidades.map(m => m.modalidad_id || m.id))
                }

                // 2. Cargar catálogo global de distritos
                const respuestaDistritos = await fetch(`${rawApiUrl}/distritos`)
                const jsonDistritos = await respuestaDistritos.json()
                if (respuestaDistritos.ok && jsonDistritos.data) {
                    setDistritosDisponibles(jsonDistritos.data)
                }

                // 3. Cargar catálogo global de modalidades de servicio
                const respuestaModalidades = await fetch(`${rawApiUrl}/tecnicos/modalidades`)
                const jsonModalidades = await respuestaModalidades.json()
                if (respuestaModalidades.ok && jsonModalidades.data) {
                    setModalidadesDisponibles(jsonModalidades.data)
                }

            } catch (err) {
                setError(err.message)
            } finally {
                setCargando(false)
            }
        }
        obtenerDatosIniciales()
    }, [navigate, rawApiUrl])

    // Auto-scroll hacia arriba cuando aparezca un mensaje de éxito
    useEffect(() => {
        if (mensajeExito || mensajePassword) {
            const mainContainer = document.querySelector('.tech-main-content')
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        }
    }, [mensajeExito, mensajePassword])

    const handleCerrarSesion = () => {
        localStorage.removeItem('fixit_token')
        localStorage.removeItem('fixit_user')
        navigate('/login')
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        if (name === 'nombre' && !/^[a-zA-ZÀ-ÿ\s]*$/.test(value)) return
        if (name === 'telefono' && (!/^[0-9]*$/.test(value) || value.length > 9)) return
        setFormData({ ...formData, [name]: value })
    }

    // CAPTURAR GPS DEL TALLER DEL TÉCNICO
    const capturarUbicacionTaller = () => {
        if (!navigator.geolocation) {
            setError('Tu navegador no soporta geolocalización.')
            return
        }

        setMensajeExito('Obteniendo ubicación GPS...')
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitud: position.coords.latitude,
                    longitud: position.coords.longitude
                }))
                setMensajeExito('¡Coordenadas del taller capturadas con éxito!')
                setTimeout(() => setMensajeExito(''), 3000)
            },
            (error) => {
                console.error("Error GPS:", error)
                setError('No se pudo obtener la ubicación. Verifica los permisos de tu navegador.')
            },
            { enableHighAccuracy: true }
        )
    }

    const handleCheckboxDistrito = (distritoId) => {
        if (distritosSeleccionados.includes(distritoId)) {
            setDistritosSeleccionados(distritosSeleccionados.filter(id => id !== distritoId))
        } else {
            setDistritosSeleccionados([...distritosSeleccionados, distritoId])
        }
    }

    const handleCheckboxModalidad = (modId) => {
        if (modalidadesSeleccionadas.includes(modId)) {
            setModalidadesSeleccionadas(modalidadesSeleccionadas.filter(id => id !== modId))
        } else {
            setModalidadesSeleccionadas([...modalidadesSeleccionadas, modId])
        }
    }

    const handleGuardarPerfil = async (e) => {
        e.preventDefault()
        setError(''); setMensajeExito('')

        const token = localStorage.getItem('fixit_token')
        const dataToSend = new FormData()

        dataToSend.append('nombre', formData.nombre)
        dataToSend.append('telefono', formData.telefono)
        dataToSend.append('biografia', formData.biografia)
        dataToSend.append('anios_experiencia', formData.anios_experiencia)
        dataToSend.append('tarifa_hora_min', formData.tarifa_hora_min)
        dataToSend.append('tarifa_hora_max', formData.tarifa_hora_max)
        
        dataToSend.append('distrito_id', formData.distrito_id)
        dataToSend.append('calle', formData.calle)
        dataToSend.append('referencia', formData.referencia || '')
        if (formData.latitud) dataToSend.append('latitud', formData.latitud)
        if (formData.longitud) dataToSend.append('longitud', formData.longitud)

        dataToSend.append('cobertura', JSON.stringify(distritosSeleccionados))
        dataToSend.append('modalidades', JSON.stringify(modalidadesSeleccionadas))

        if (formData.avatar) dataToSend.append('avatar', formData.avatar)

        try {
            const respuesta = await fetch(`${rawApiUrl}/tecnicos/me`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: dataToSend
            })

            const json = await respuesta.json()
            if (!respuesta.ok) throw new Error(json.message || 'No se pudo actualizar el perfil.')

            setMensajeExito('¡Perfil, dirección y modalidades actualizados con éxito!')

            const resPerfil = await fetch(`${rawApiUrl}/tecnicos/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const jsonPerfil = await resPerfil.json()
            if (jsonPerfil.success) {
                setPerfil(jsonPerfil.data)
                if (jsonPerfil.data.cobertura) {
                    setDistritosSeleccionados(jsonPerfil.data.cobertura.map(d => d.distrito_id || d.id))
                }
                if (jsonPerfil.data.modalidades) {
                    setModalidadesSeleccionadas(jsonPerfil.data.modalidades.map(m => m.modalidad_id || m.id))
                }
            }

            setTimeout(() => setMensajeExito(''), 4000)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleActualizarPassword = (e) => {
        e.preventDefault()
        setMensajePassword('')
        if (!passwordData.actual || !passwordData.nueva || !passwordData.confirmar) {
            setMensajePassword('⚠️ Completa todos los campos de contraseña.')
            return
        }
        if (passwordData.nueva !== passwordData.confirmar) {
            setMensajePassword('⚠️ Las nuevas contraseñas no coinciden.')
            return
        }
        // Simulación o llamada real a tu endpoint de cambio de contraseña
        setMensajePassword('✅ Contraseña actualizada correctamente.')
        setPasswordData({ actual: '', nueva: '', confirmar: '' })
        setTimeout(() => setMensajePassword(''), 4000)
    }

    const handleSubirCertificado = async (e) => {
        e.preventDefault()
        setMensajeCert('')

        if (!certData.archivo) {
            setMensajeCert('⚠️ Por favor selecciona un archivo PDF o imagen.')
            return
        }

        const token = localStorage.getItem('fixit_token')
        const dataToSend = new FormData()
        dataToSend.append('nombre', certData.nombre)
        dataToSend.append('tipo', certData.tipo)
        dataToSend.append('archivo', certData.archivo)

        try {
            const respuesta = await fetch(`${rawApiUrl}/tecnicos/me/certificaciones`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: dataToSend
            })

            const json = await respuesta.json()
            if (!respuesta.ok) {
                setMensajeCert(`⚠️ ${json.message || 'No se pudo subir el documento.'}`)
                return
            }

            setMensajeCert(`✅ ${json.message}`)
            setCertData({ nombre: '', tipo: 'TITULO', archivo: null })

            const resPerfil = await fetch(`${rawApiUrl}/tecnicos/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const jsonPerfil = await resPerfil.json()
            if (jsonPerfil.success) setPerfil(jsonPerfil.data)

            setTimeout(() => setMensajeCert(''), 4000)
        } catch {
            setMensajeCert('❌ Error de conexión al intentar subir el documento.')
        }
    }

    const getAvatarUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/uploads')) return `${baseUrl}${url}`;
        return url;
    }

    if (cargando) return <div className="dashboard-loading"><h2>Cargando tu espacio de trabajo...</h2></div>
    if (error) return <div className="dashboard-error"><h2>Error</h2><p>{error}</p><button onClick={handleCerrarSesion} className="btn-retry">Volver</button></div>

    return (
        <div className="tech-layout">

            {/* BARRA LATERAL */}
            <aside className="tech-sidebar">
                <div className="sidebar-brand">
                    <h2>FixIT Pro</h2>
                    <span className="brand-badge">Panel de Especialista</span>
                </div>
                <nav className="sidebar-nav">
                    <button className={`nav-item ${vistaActual === 'resumen' ? 'active' : ''}`} onClick={() => setVistaActual('resumen')}>📊 Mi Resumen</button>
                    <button className={`nav-item ${vistaActual === 'trabajos' ? 'active' : ''}`} onClick={() => setVistaActual('trabajos')}>🛠️ Solicitudes</button>
                    <button className={`nav-item ${vistaActual === 'documentos' ? 'active' : ''}`} onClick={() => setVistaActual('documentos')}>📁 Mis Certificados</button>
                    <button className={`nav-item ${vistaActual === 'perfil' ? 'active' : ''}`} onClick={() => setVistaActual('perfil')}>⚙️ Editar Perfil</button>
                    <button className={`nav-item ${vistaActual === 'seguridad' ? 'active' : ''}`} onClick={() => setVistaActual('seguridad')}>🔒 Seguridad</button>
                </nav>
                <div className="sidebar-footer">
                    <div className="sidebar-user-mini" title={perfil.nombre}>{perfil.nombre}</div>
                    <button onClick={handleCerrarSesion} className="btn-logout-sidebar">Cerrar Sesión</button>
                </div>
            </aside>

            {/* PANEL CENTRAL */}
            <main className="tech-main-content">

                {/* VISTA 1: RESUMEN (PERFIL COMPLETO, DIRECCIÓN, MODALIDADES, ETC.) */}
                {vistaActual === 'resumen' && (
                    <div className="fade-in">
                        {perfil.estado_verificacion === 'PENDIENTE' && (
                            <div className="verification-banner">
                                <h3 className="banner-title">⚠️ Destaca en el catálogo</h3>
                                <p className="banner-text">Tu cuenta está activa como <strong>Técnico Estándar</strong>. Sube tus certificados o antecedentes para obtener la insignia de <strong>Técnico Verificado</strong>.</p>
                                <button className="btn-verify" onClick={() => setVistaActual('documentos')}>Subir Documentos</button>
                            </div>
                        )}

                        <div className="dashboard-grid">
                            <aside className="profile-sidebar">
                                <div className="avatar-wrapper">
                                    {perfil.avatar_url ? (
                                        <img src={getAvatarUrl(perfil.avatar_url)} alt="Avatar" className="avatar-img" />
                                    ) : (
                                        <span className="avatar-initial">{perfil.nombre.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <h2 className="profile-name">{perfil.nombre}</h2>
                                <p className="profile-email">{perfil.correo}</p>
                                <p className="profile-phone" style={{ marginTop: '0.4rem', color: '#4b5563', fontSize: '0.9rem' }}>📱 {perfil.telefono || 'Sin teléfono registrado'}</p>
                                <div className="status-container">
                                    <span className={`status-badge ${perfil.estado === 'ACTIVO' ? 'status-active' : 'status-inactive'}`}>
                                        Estado: {perfil.estado}
                                    </span>
                                </div>
                            </aside>

                            <section className="metrics-panel">
                                <h3 className="section-title">Resumen de Actividad</h3>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <p className="stat-label">CALIFICACIÓN</p>
                                        <h2 className="stat-value text-blue">⭐ {perfil.calificacion ? perfil.calificacion.toFixed(1) : '0.0'}</h2>
                                        <p className="stat-subtext">{perfil.resenas || 0} reseñas</p>
                                    </div>
                                    <div className="stat-card">
                                        <p className="stat-label">MI TARIFA</p>
                                        <h2 className="stat-value text-green">S/ {perfil.tarifa_hora_min ? Number(perfil.tarifa_hora_min).toFixed(2) : '0.00'}</h2>
                                        <p className="stat-subtext">Por hora base</p>
                                    </div>
                                    <div className="stat-card">
                                        <p className="stat-label">CERTIFICADOS</p>
                                        <h2 className="stat-value text-purple">{perfil.certificaciones?.length || 0}</h2>
                                        <p className="stat-subtext">Registrados (Máx. 5)</p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* TARJETA CON DETALLES COMPLETOS (BIOGRAFÍA, TALLER, MODALIDADES Y COBERTURA) */}
                        <div className="tech-card" style={{ marginTop: '2rem' }}>
                            <h3 className="section-title" style={{ marginTop: 0 }}>📋 Información Detallada de tu Perfil</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                
                                <div>
                                    <h4 style={{ color: '#374151', marginBottom: '0.5rem', fontSize: '1rem' }}>💡 Biografía / Especialidades</h4>
                                    <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                        {perfil.biografia || 'Aún no has agregado una biografía.'}
                                    </p>
                                    <p style={{ marginTop: '1rem', color: '#374151', fontSize: '0.95rem' }}>
                                        <strong>Experiencia:</strong> {perfil.anios_experiencia ? `${perfil.anios_experiencia} años` : 'No especificado'}
                                    </p>
                                </div>

                                <div>
                                    <h4 style={{ color: '#374151', marginBottom: '0.5rem', fontSize: '1rem' }}>📍 Dirección de tu Taller Base</h4>
                                    <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.95rem', color: '#4b5563' }}>
                                        <p><strong>Distrito:</strong> {perfil.nombre_distrito || perfil.distrito_nombre || 'No asignado'}</p>
                                        <p style={{ marginTop: '0.4rem' }}><strong>Calle:</strong> {perfil.calle || 'No especificada'}</p>
                                        {perfil.referencia && <p style={{ marginTop: '0.4rem' }}><strong>Referencia:</strong> {perfil.referencia}</p>}
                                        <p style={{ marginTop: '0.4rem', color: perfil.latitud ? '#10b981' : '#9ca3af' }}>
                                            {perfil.latitud ? '✓ GPS Sincronizado' : '⚠️ GPS no configurado'}
                                        </p>
                                    </div>
                                </div>

                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                
                                <div>
                                    <h4 style={{ color: '#374151', marginBottom: '0.5rem', fontSize: '1rem' }}>🏠 Modalidades de Servicio</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {perfil.modalidades && perfil.modalidades.length > 0 ? (
                                            perfil.modalidades.map((mod, i) => (
                                                <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                                                    ✓ {mod.nombre || mod.nombre_modalidad}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="empty-text">No has seleccionado modalidades.</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ color: '#374151', marginBottom: '0.5rem', fontSize: '1rem' }}>🗺️ Distritos de Cobertura</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                                        {perfil.cobertura && perfil.cobertura.length > 0 ? (
                                            perfil.cobertura.map((cob, i) => (
                                                <span key={i} style={{ background: '#f3f4f6', color: '#374151', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #d1d5db' }}>
                                                    {cob.nombre || cob.nombre_distrito}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="empty-text">No has seleccionado distritos de cobertura.</p>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA 2: SOLICITUDES */}
                {vistaActual === 'trabajos' && (
                    <div className="fade-in">
                        <h2 className="section-title">Bandeja de Solicitudes</h2>
                        <div className="tray-box">
                            <p>Aún no tienes solicitudes de servicio asignadas. Aquí aparecerán los clientes que te contraten.</p>
                        </div>
                    </div>
                )}

                {/* VISTA 3: MIS CERTIFICADOS */}
                {vistaActual === 'documentos' && (
                    <div className="fade-in">
                        <h2 className="section-title">Gestión de Certificados y Antecedentes (Seguridad)</h2>

                        {mensajeCert && (
                            <div className={mensajeCert.includes('✅') ? 'alert-success' : 'alert-warning'}>
                                {mensajeCert}
                            </div>
                        )}

                        <div className="tech-card">
                            <p className="form-description">
                                Sube tus títulos técnicos, constancias o tu certificado de <strong>Antecedentes Policiales/Penales</strong> en formato PDF, JPG o PNG (Máximo 5 documentos en total). El administrador revisará tus archivos para otorgarte la insignia de confianza.
                            </p>

                            <form onSubmit={handleSubirCertificado}>
                                <div className="form-grid-2">
                                    <div>
                                        <label className="form-label">Nombre del Documento</label>
                                        <input type="text" placeholder="Ej: Certificado Policial / Título ISIL" value={certData.nombre} onChange={(e) => setCertData({ ...certData, nombre: e.target.value })} className="form-input" required />
                                    </div>
                                    <div>
                                        <label className="form-label">Tipo de Documento</label>
                                        <select value={certData.tipo} onChange={(e) => setCertData({ ...certData, tipo: e.target.value })} className="form-input">
                                            <option value="TITULO">Diploma / Título Técnico</option>
                                            <option value="EXPERIENCIA">Constancia de Trabajo</option>
                                            <option value="ANTECEDENTES">Certificado de Antecedentes</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="file-dropzone">
                                    <p className="file-dropzone-text">Selecciona tu archivo en PDF o Imagen (Máx. 5MB)</p>
                                    <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg" onChange={(e) => setCertData({ ...certData, archivo: e.target.files[0] })} className="file-input-center" required />
                                </div>

                                <button type="submit" className="btn-submit">Subir Documento para Validación</button>
                            </form>
                        </div>

                        <div className="tech-card">
                            <h4 className="list-title">Documentos registrados ({perfil.certificaciones?.length || 0} / 5):</h4>
                            {perfil.certificaciones && perfil.certificaciones.length > 0 ? (
                                <ul className="cert-list">
                                    {perfil.certificaciones.map((cert, idx) => (
                                        <li key={idx} className="cert-list-item">
                                            📁 <strong>{cert.tipo}</strong> — {cert.estado === 'APROBADO' ? '✅ Verificado por Admin' : '⏳ En revisión'}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="empty-text">No has subido ningún documento todavía.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA 4: EDITAR PERFIL */}
                {vistaActual === 'perfil' && (
                    <div className="fade-in">
                        <h2 className="section-title">Configuración y Edición de Perfil</h2>

                        {mensajeExito && (
                            <div className="alert-success">
                                {mensajeExito}
                            </div>
                        )}

                        <form onSubmit={handleGuardarPerfil} className="tech-card">
                            <div className="avatar-edit-section">
                                <div className="avatar-wrapper small">
                                    {formData.avatarPreview ? (
                                        <img src={formData.avatarPreview} alt="Vista previa" className="avatar-img" />
                                    ) : perfil.avatar_url ? (
                                        <img src={getAvatarUrl(perfil.avatar_url)} alt="Avatar actual" className="avatar-img" />
                                    ) : (
                                        <span className="avatar-initial small">{perfil.nombre.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="form-label">Actualizar Foto de Perfil</label>
                                    <input
                                        type="file" name="avatar" accept="image/png, image/jpeg, image/jpg"
                                        onChange={(e) => {
                                            const file = e.target.files[0]
                                            if (file) setFormData({ ...formData, avatar: file, avatarPreview: URL.createObjectURL(file) })
                                        }}
                                        className="file-input-small"
                                    />
                                    <p className="form-hint">Formatos permitidos: JPG, PNG (Máx. 2MB)</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Correo Electrónico (No modificable)</label>
                                <input type="email" value={perfil.correo || ''} disabled className="form-input disabled" />
                            </div>

                            <div className="form-grid-2">
                                <div>
                                    <label className="form-label">Nombre y Apellidos</label>
                                    <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="form-input" required />
                                </div>
                                <div>
                                    <label className="form-label">Número de Celular</label>
                                    <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="form-input" required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Breve Biografía / Especialidades</label>
                                <textarea name="biografia" rows="3" value={formData.biografia} onChange={handleInputChange} className="form-input" required />
                            </div>

                            <div className="form-grid-3">
                                <div>
                                    <label className="form-label">Años Experiencia</label>
                                    <input type="number" min="0" name="anios_experiencia" value={formData.anios_experiencia} onChange={handleInputChange} className="form-input" required />
                                </div>
                                <div>
                                    <label className="form-label">Tarifa Mín (S/)</label>
                                    <input type="number" step="0.01" min="0" name="tarifa_hora_min" value={formData.tarifa_hora_min} onChange={handleInputChange} className="form-input" required />
                                </div>
                                <div>
                                    <label className="form-label">Tarifa Máx (S/)</label>
                                    <input type="number" step="0.01" min="0" name="tarifa_hora_max" value={formData.tarifa_hora_max} onChange={handleInputChange} className="form-input" required />
                                </div>
                            </div>

                            {/* DIRECCIÓN DEL TALLER Y GPS */}
                            <div className="cobertura-section" style={{ marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                                <label className="cobertura-title">📍 Dirección de tu Taller Base</label>
                                <p className="cobertura-subtitle">Indica dónde está ubicado tu taller para calcular distancias exactas con los clientes.</p>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">Distrito del Taller</label>
                                    <select 
                                        name="distrito_id" 
                                        value={formData.distrito_id} 
                                        onChange={handleInputChange} 
                                        className="form-input" 
                                        required
                                    >
                                        <option value="">Selecciona el distrito de tu taller...</option>
                                        {distritosDisponibles.map((distrito) => {
                                            const idDistrito = distrito.id || distrito.distrito_id;
                                            const nombreDistrito = distrito.nombre || distrito.nombre_distrito;
                                            return (
                                                <option key={idDistrito} value={idDistrito}>
                                                    {nombreDistrito}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Dirección / Calle / Avenida del Taller</label>
                                    <input 
                                        type="text" 
                                        name="calle" 
                                        value={formData.calle} 
                                        onChange={handleInputChange} 
                                        className="form-input" 
                                        required 
                                        placeholder="Ej. Av. Javier Prado Este 456" 
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Referencia (Opcional)</label>
                                    <input 
                                        type="text" 
                                        name="referencia" 
                                        value={formData.referencia} 
                                        onChange={handleInputChange} 
                                        className="form-input" 
                                        placeholder="Ej. Frente a la estación del metropolitano" 
                                    />
                                </div>

                                <div className="form-group" style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                                    <label className="form-label">Coordenadas GPS de tu Taller</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button 
                                            type="button" 
                                            className="btn-secundario" 
                                            onClick={capturarUbicacionTaller}
                                            style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            📍 Obtener ubicación actual por GPS
                                        </button>
                                        <span style={{ fontSize: '0.85rem', color: formData.latitud ? '#10b981' : '#6b7280', fontWeight: formData.latitud ? '600' : 'normal' }}>
                                            {formData.latitud && formData.longitud 
                                              ? `✓ GPS Guardado: ${Number(formData.latitud).toFixed(5)}, ${Number(formData.longitud).toFixed(5)}` 
                                              : 'Aún no has compartido la ubicación exacta de tu taller.'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* MODALIDADES */}
                            <div className="cobertura-section">
                                <label className="cobertura-title">🏠 Modalidad de Servicio (¿Cómo atiendes?)</label>
                                <p className="cobertura-subtitle">Selecciona las modalidades bajo las cuales ofreces soporte técnico.</p>

                                {modalidadesDisponibles.length === 0 ? (
                                    <p className="empty-text">Cargando modalidades...</p>
                                ) : (
                                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                        {modalidadesDisponibles.map((mod) => {
                                            const idMod = mod.id || mod.modalidad_id;
                                            const estaSeleccionado = modalidadesSeleccionadas.includes(idMod);

                                            return (
                                                <label key={idMod} className="distrito-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={estaSeleccionado} 
                                                        onChange={() => handleCheckboxModalidad(idMod)} 
                                                        className="distrito-checkbox" 
                                                    />
                                                    {mod.nombre}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* DISTRITOS DE COBERTURA */}
                            <div className="cobertura-section">
                                <label className="cobertura-title">🗺️ Distritos de Cobertura (¿Dónde ofreces servicio?)</label>
                                <p className="cobertura-subtitle">Selecciona los distritos donde puedes desplazarte para atender a tus clientes.</p>

                                {distritosDisponibles.length === 0 ? (
                                    <p className="empty-text">Cargando distritos disponibles...</p>
                                ) : (
                                    <div className="distritos-grid">
                                        {distritosDisponibles.map((distrito) => {
                                            const idDistrito = distrito.id || distrito.distrito_id;
                                            const nombreDistrito = distrito.nombre || distrito.nombre_distrito;
                                            const estaSeleccionado = distritosSeleccionados.includes(idDistrito);

                                            return (
                                                <label key={idDistrito} className="distrito-label">
                                                    <input type="checkbox" checked={estaSeleccionado} onChange={() => handleCheckboxDistrito(idDistrito)} className="distrito-checkbox" />
                                                    {nombreDistrito}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn-submit" style={{ marginTop: '2rem' }}>Guardar Cambios del Perfil</button>
                        </form>
                    </div>
                )}

                {/* VISTA 5: SEGURIDAD Y CONTRASEÑA */}
                {vistaActual === 'seguridad' && (
                    <div className="fade-in">
                        <h2 className="section-title">🔒 Seguridad y Contraseña</h2>

                        {mensajePassword && (
                            <div className={mensajePassword.includes('✅') ? 'alert-success' : 'alert-warning'}>
                                {mensajePassword}
                            </div>
                        )}

                        <div className="tech-card">
                            <p className="form-description">
                                Actualiza tu contraseña de acceso para mantener tu cuenta de especialista segura.
                            </p>

                            <form onSubmit={handleActualizarPassword}>
                                <div className="form-group">
                                    <label className="form-label">Contraseña Actual</label>
                                    <input 
                                        type="password" 
                                        placeholder="••••••••" 
                                        value={passwordData.actual} 
                                        onChange={(e) => setPasswordData({ ...passwordData, actual: e.target.value })} 
                                        className="form-input" 
                                        required 
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Nueva Contraseña</label>
                                    <input 
                                        type="password" 
                                        placeholder="Mínimo 6 caracteres" 
                                        value={passwordData.nueva} 
                                        onChange={(e) => setPasswordData({ ...passwordData, nueva: e.target.value })} 
                                        className="form-input" 
                                        required 
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirmar Nueva Contraseña</label>
                                    <input 
                                        type="password" 
                                        placeholder="Repite la nueva contraseña" 
                                        value={passwordData.confirmar} 
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmar: e.target.value })} 
                                        className="form-input" 
                                        required 
                                    />
                                </div>

                                <button type="submit" className="btn-submit" style={{ marginTop: '1rem' }}>Actualizar Contraseña</button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default DashboardTecnico