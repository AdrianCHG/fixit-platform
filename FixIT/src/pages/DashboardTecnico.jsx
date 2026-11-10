import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './DashboardTecnico.css'

function DashboardTecnico() {
    const navigate = useNavigate()
    const [perfil, setPerfil] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')

    // Controla qué pestaña del menú lateral estamos viendo
    const [vistaActual, setVistaActual] = useState('resumen')

    // Estados para el formulario de "Editar Perfil"
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        biografia: '',
        anios_experiencia: '',
        tarifa_hora_min: '',
        tarifa_hora_max: '',
        avatar: null,
        avatarPreview: null
    })
    const [mensajeExito, setMensajeExito] = useState('')

    // Estados para la sección de Certificados y Antecedentes (Declarados correctamente)
    const [certData, setCertData] = useState({
        nombre: '',
        tipo: 'TITULO',
        archivo: null
    })
    const [mensajeCert, setMensajeCert] = useState('')

    useEffect(() => {
        const obtenerMiPerfil = async () => {
            const token = localStorage.getItem('fixit_token')
            if (!token) {
                navigate('/login')
                return
            }

            try {
                const respuesta = await fetch('http://localhost:3000/api/tecnicos/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                const json = await respuesta.json()
                if (!respuesta.ok) throw new Error(json.message || 'Error al cargar tu información.')

                setPerfil(json.data)

                setFormData({
                    nombre: json.data.nombre || '',
                    telefono: json.data.telefono || '',
                    biografia: json.data.biografia || '',
                    anios_experiencia: json.data.anios_experiencia || '',
                    tarifa_hora_min: json.data.tarifa_hora_min || '',
                    tarifa_hora_max: json.data.tarifa_hora_max || '',
                    avatar: null,
                    avatarPreview: null
                })
            } catch (err) {
                setError(err.message)
            } finally {
                setCargando(false)
            }
        }
        obtenerMiPerfil()
    }, [navigate])

    const handleCerrarSesion = () => {
        localStorage.removeItem('fixit_token')
        localStorage.removeItem('fixit_user')
        navigate('/login')
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target

        if (name === 'nombre') {
            const regexSoloLetras = /^[a-zA-ZÀ-ÿ\s]*$/
            if (!regexSoloLetras.test(value)) return
        }

        if (name === 'telefono') {
            const regexSoloNumeros = /^[0-9]*$/
            if (!regexSoloNumeros.test(value) || value.length > 9) return
        }

        setFormData({
            ...formData,
            [name]: value
        })
    }

    const handleGuardarPerfil = async (e) => {
        e.preventDefault()
        setError('')
        setMensajeExito('')

        const token = localStorage.getItem('fixit_token')
        const dataToSend = new FormData()

        dataToSend.append('nombre', formData.nombre)
        dataToSend.append('telefono', formData.telefono)
        dataToSend.append('biografia', formData.biografia)
        dataToSend.append('anios_experiencia', formData.anios_experiencia)
        dataToSend.append('tarifa_hora_min', formData.tarifa_hora_min)
        dataToSend.append('tarifa_hora_max', formData.tarifa_hora_max)

        if (formData.avatar) {
            dataToSend.append('avatar', formData.avatar)
        }

        try {
            const respuesta = await fetch('http://localhost:3000/api/tecnicos/me', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: dataToSend
            })

            const json = await respuesta.json()
            if (!respuesta.ok) throw new Error(json.message || 'No se pudo actualizar el perfil.')

            setMensajeExito('¡Perfil actualizado con éxito en la base de datos!')

            const resPerfil = await fetch('http://localhost:3000/api/tecnicos/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const jsonPerfil = await resPerfil.json()
            if (jsonPerfil.success) setPerfil(jsonPerfil.data)

            setTimeout(() => setMensajeExito(''), 4000)
        } catch (err) {
            setError(err.message)
        }
    }

    // SUBIDA DE CERTIFICADOS Y ANTECEDENTES
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
            const respuesta = await fetch('http://localhost:3000/api/tecnicos/me/certificaciones', {
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

            const resPerfil = await fetch('http://localhost:3000/api/tecnicos/me', {
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
        if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
        return url;
    }

    if (cargando) return <div className="dashboard-loading"><h2>Cargando tu espacio de trabajo...</h2></div>
    if (error) return <div className="dashboard-error"><h2>Error</h2><p>{error}</p><button onClick={handleCerrarSesion} className="btn-retry">Volver</button></div>

    return (
        <div className="tech-layout">

            {/* ================= BARRA LATERAL (SIDEBAR) ================= */}
            <aside className="tech-sidebar">
                <div className="sidebar-brand">
                    <h2>FixIT Pro</h2>
                    <span className="brand-badge">Panel de Especialista</span>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${vistaActual === 'resumen' ? 'active' : ''}`}
                        onClick={() => setVistaActual('resumen')}
                    >
                        📊 Mi Resumen
                    </button>
                    <button
                        className={`nav-item ${vistaActual === 'trabajos' ? 'active' : ''}`}
                        onClick={() => setVistaActual('trabajos')}
                    >
                        🛠️ Solicitudes
                    </button>
                    <button
                        className={`nav-item ${vistaActual === 'documentos' ? 'active' : ''}`}
                        onClick={() => setVistaActual('documentos')}
                    >
                        📁 Mis Certificados
                    </button>
                    <button
                        className={`nav-item ${vistaActual === 'perfil' ? 'active' : ''}`}
                        onClick={() => setVistaActual('perfil')}
                    >
                        ⚙️ Editar Perfil
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user-mini" title={perfil.nombre}>
                        {perfil.nombre}
                    </div>
                    <button onClick={handleCerrarSesion} className="btn-logout-sidebar">
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* ================= PANEL CENTRAL ================= */}
            <main className="tech-main-content">

                {/* VISTA 1: RESUMEN */}
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
                                        <h2 className="stat-value text-blue">⭐ {perfil.calificacion.toFixed(1)}</h2>
                                        <p className="stat-subtext">{perfil.resenas} reseñas</p>
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

                {/* VISTA 3: MIS CERTIFICADOS Y ANTECEDENTES */}
                {vistaActual === 'documentos' && (
                    <div className="fade-in">
                        <h2 className="section-title">Gestión de Certificados y Antecedentes (Seguridad)</h2>

                        {mensajeCert && (
                            <div style={{
                                backgroundColor: mensajeCert.includes('✅') ? '#d1fae5' : '#fef3c7',
                                color: mensajeCert.includes('✅') ? '#065f46' : '#92400e',
                                padding: '1rem',
                                borderRadius: '6px',
                                marginBottom: '1.5rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                border: mensajeCert.includes('✅') ? '1px solid #10b981' : '1px solid #f59e0b'
                            }}>
                                {mensajeCert}
                            </div>
                        )}

                        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
                            <p style={{ color: '#4b5563', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                Sube tus títulos técnicos, constancias o tu certificado de <strong>Antecedentes Policiales/Penales</strong> en formato PDF, JPG o PNG (Máximo 5 documentos en total). El administrador revisará tus archivos para otorgarte la insignia de confianza.
                            </p>

                            <form onSubmit={handleSubirCertificado}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Nombre del Documento</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Certificado Policial / Título ISIL"
                                            value={certData.nombre}
                                            onChange={(e) => setCertData({ ...certData, nombre: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Tipo de Documento</label>
                                        <select
                                            value={certData.tipo}
                                            onChange={(e) => setCertData({ ...certData, tipo: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                                        >
                                            <option value="TITULO">Diploma / Título Técnico</option>
                                            <option value="EXPERIENCIA">Constancia de Trabajo</option>
                                            <option value="ANTECEDENTES">Certificado de Antecedentes</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ border: '2px dashed #cbd5e1', padding: '1.5rem', textAlign: 'center', borderRadius: '6px', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>Selecciona tu archivo en PDF o Imagen (Máx. 5MB)</p>
                                    <input
                                        type="file"
                                        accept=".pdf,image/png,image/jpeg,image/jpg"
                                        onChange={(e) => setCertData({ ...certData, archivo: e.target.files[0] })}
                                        style={{ display: 'block', margin: '0 auto' }}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn-verify" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2563eb', fontWeight: 'bold', borderRadius: '6px', color: 'white', border: 'none', cursor: 'pointer' }}>
                                    Subir Documento para Validación
                                </button>
                            </form>
                        </div>

                        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ color: '#374151', marginBottom: '1rem', marginTop: 0 }}>Documentos registrados ({perfil.certificaciones?.length || 0} / 5):</h4>
                            {perfil.certificaciones && perfil.certificaciones.length > 0 ? (
                                <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                    {perfil.certificaciones.map((cert, idx) => (
                                        <li key={idx} style={{ marginBottom: '0.5rem', color: '#4b5563' }}>
                                            📁 <strong>{cert.tipo}</strong> — {cert.estado === 'APROBADO' ? '✅ Verificado por Admin' : '⏳ En revisión'}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No has subido ningún documento todavía.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA 4: EDITAR PERFIL */}
                {vistaActual === 'perfil' && (
                    <div className="fade-in">
                        <h2 className="section-title">Configuración y Edición de Perfil</h2>

                        {mensajeExito && (
                            <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>
                                {mensajeExito}
                            </div>
                        )}

                        <form onSubmit={handleGuardarPerfil} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
                                <div className="avatar-wrapper" style={{ width: '90px', height: '90px', margin: 0 }}>
                                    {formData.avatarPreview ? (
                                        <img src={formData.avatarPreview} alt="Vista previa" className="avatar-img" />
                                    ) : perfil.avatar_url ? (
                                        <img src={getAvatarUrl(perfil.avatar_url)} alt="Avatar actual" className="avatar-img" />
                                    ) : (
                                        <span className="avatar-initial" style={{ fontSize: '2rem' }}>{perfil.nombre.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Actualizar Foto de Perfil</label>
                                    <input
                                        type="file"
                                        name="avatar"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={(e) => {
                                            const file = e.target.files[0]
                                            if (file) {
                                                setFormData({ ...formData, avatar: file, avatarPreview: URL.createObjectURL(file) })
                                            }
                                        }}
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>Formatos permitidos: JPG, PNG (Máx. 2MB)</p>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Correo Electrónico (No modificable)</label>
                                <input
                                    type="email"
                                    value={perfil.correo || ''}
                                    disabled
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Nombre y Apellidos</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Número de Celular</label>
                                    <input
                                        type="text"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Breve Biografía / Especialidades</label>
                                <textarea
                                    name="biografia"
                                    rows="3"
                                    value={formData.biografia}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Años Experiencia</label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="anios_experiencia"
                                        value={formData.anios_experiencia}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Tarifa Mín (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="tarifa_hora_min"
                                        value={formData.tarifa_hora_min}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>Tarifa Máx (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="tarifa_hora_max"
                                        value={formData.tarifa_hora_max}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-verify" style={{ width: '100%', padding: '0.85rem', backgroundColor: '#2563eb', fontWeight: 'bold', borderRadius: '6px', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                                Guardar Cambios del Perfil
                            </button>
                        </form>
                    </div>
                )}

            </main>
        </div>
    )
}

export default DashboardTecnico