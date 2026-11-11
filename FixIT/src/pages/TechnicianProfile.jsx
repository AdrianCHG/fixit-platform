import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './TechnicianProfile.css'

function TechnicianProfile() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [tecnico, setTecnico] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // URL base dinámica para producción y desarrollo
  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const baseUrl = rawApiUrl.replace(/\/api$/, '')

  useEffect(() => {
    let activo = true
    const controlador = new AbortController()

    const obtenerPerfilTecnico = async () => {
      try {
        setCargando(true)
        setError(null)

        const respuesta = await fetch(`${rawApiUrl}/tecnicos/${id}`, {
          signal: controlador.signal
        })
        
        if (!respuesta.ok) {
          throw new Error('No se pudo encontrar el perfil del técnico')
        }

        const json = await respuesta.json() 
        
        // --- DEBUGEAR EN CONSOLA EL JSON EXACTO DEL BACKEND ---
        console.log("JSON RECIBIDO DEL TÉCNICO:", json)

        if (json.success && json.data) {
           if (activo) setTecnico(json.data) 
        } else if (json) {
           // Por si el backend devuelve el objeto directo sin .data
           if (activo) setTecnico(json)
        } else {
           throw new Error(json.message || 'Error al obtener datos')
        }

      } catch (err) {
        if (err.name !== 'AbortError' && activo) {
          console.error("Error al cargar el perfil:", err)
          setError(err.message)
        }
      } finally {
        if (activo) setCargando(false)
      }
    }

    obtenerPerfilTecnico()

    return () => {
      activo = false
      controlador.abort()
    }
  }, [id, rawApiUrl])

  const handleVolver = () => {
    navigate(-1)
  }

  if (cargando) {
    return <div className="loading-container"><h2>Cargando perfil del técnico...</h2></div>
  }

  if (error || !tecnico) {
    return (
      <div className="error-container">
        <h2>Error: {error || 'No se encontró información'}</h2>
        <button type="button" onClick={handleVolver}>Volver</button>
      </div>
    )
  }

  // --- BUSCAR EN CUALQUIER PROPIEDAD POSIBLE LAS ZONAS DE ATENCIÓN ---
  const zonasRaw = 
    tecnico.zonas_atencion || 
    tecnico.distritos || 
    tecnico.zonas || 
    tecnico.cobertura || 
    tecnico.zonasAtencion || []

  const obtenerZonasAtencion = () => {
    if (!Array.isArray(zonasRaw) || zonasRaw.length === 0) return null

    return zonasRaw
      .map((zona) => {
        if (typeof zona === 'string') return zona
        return zona.distrito || zona.nombre || zona.zona || zona.nombre_distrito || ''
      })
      .filter(Boolean)
      .join(' · ')
  }

  const textoZonas = obtenerZonasAtencion()

  // --- FILTRO DE CERTIFICACIONES APROBADAS ---
  const certificacionesAprobadas = (tecnico.certificaciones || tecnico.estudios || []).filter(
    (cert) => cert.verificada === 1 || cert.estado === 'APROBADO' || cert.aprobado === true || cert.verificado === 1
  )

  return (
    <div className="profile-container">
      <div className="profile-card">
        
        <button type="button" className="btn-back" onClick={handleVolver}>← Volver a resultados</button>

        {/* --- CABECERA (FOTO Y TÍTULO) --- */}
        <div className="profile-header">
          <div className="profile-avatar-large">
          {tecnico.avatar_url ? (
            <img
              src={
                tecnico.avatar_url.startsWith('/uploads')
                  ? `${baseUrl}${tecnico.avatar_url}`
                  : tecnico.avatar_url
              }
              alt={`Foto de ${tecnico.nombre}`}
              className="profile-avatar-image"
            />
          ) : (
            <span>{tecnico.nombre?.charAt(0).toUpperCase()}</span>
          )}
        </div>
          <div className="profile-title-area">
            <div className="profile-title-row">
              <h2>{tecnico.nombre || tecnico.nombre_completo}</h2>
              {tecnico.acepta_reservas === 1 && (
                <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Disponible hoy
                </span>
              )}
            </div>
            <div className="profile-specialty">
              {tecnico.especialidades?.join(' - ') || 'Especialista Técnico'}
            </div>
            <div className="profile-location">
              📍 Zonas de atención: {textoZonas ? textoZonas : <span style={{ color: '#ef4444' }}>No se detectaron zonas en el objeto JSON (ver consola F12)</span>}
            </div>
          </div>
        </div>

        {/* --- GRILLA DE ESTADÍSTICAS --- */}
        <div className="profile-stats-grid">
          <div className="stat-box">
            <span className="stat-value">★ {tecnico.calificacion || '0'}</span>
            <span className="stat-label">RESEÑAS ({tecnico.resenas || 0})</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{tecnico.anios_experiencia || 0} años</span>
            <span className="stat-label">EXPERIENCIA</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{certificacionesAprobadas.length}</span>
            <span className="stat-label">CERTIFICACIONES</span>
          </div>
        </div>

        <hr className="profile-divider" />

        {/* --- CONTENIDO (BIOGRAFÍA Y CERTIFICADOS) --- */}
        <div className="profile-content">
          <div className="content-section">
            <h3>Sobre mí</h3>
            <p>{tecnico.biografia || 'Sin biografía registrada.'}</p>
          </div>

          <div className="content-section">
            <h3>Certificaciones y Estudios</h3>
            {certificacionesAprobadas.length > 0 ? (
              <ul className="certifications-list">
                {certificacionesAprobadas.map((cert, index) => (
                  <li key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    🎓 {cert.nombre || cert.titulo} ✅
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.95rem', fontStyle: 'italic' }}>
                El especialista aún no cuenta con certificaciones aprobadas por administración.
              </p>
            )}
          </div>
        </div>

        <hr className="profile-divider" />

        {/* --- FOOTER (TARIFA Y BOTÓN) --- */}
        <div className="profile-footer">
          <div className="price-info">
            <span className="price-label">TARIFA DE VISITA TÉCNICA</span>
            <span className="price-value">
              S/ {tecnico.tarifa_hora_min ? Number(tecnico.tarifa_hora_min).toFixed(2) : '0.00'}
            </span>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`/reservar/${id}`)}
          >
            Solicitar Servicio
          </button>
        </div>

      </div>
    </div>
  )
}

export default TechnicianProfile