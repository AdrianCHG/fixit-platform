import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TechnicianCard from '../components/TechnicianCard';
import { obtenerTecnicos, obtenerUsuarioActual } from '../services/api';
import './Technicians.css';

function Technicians() {
  const location = useLocation();

  // Evaluamos si viene del flujo de diagnóstico/triaje
  const vieneDeDiagnostico = location.state?.desdeDiagnostico || false;

  const tituloPagina = vieneDeDiagnostico
    ? 'Técnicos compatibles con tu diagnóstico'
    : 'Técnicos disponibles';

  const [orden, setOrden] = useState('recomendados');
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // ESTADOS DE FILTROS REALES
  const [cercaniaKm, setCercaniaKm] = useState(null); // null, 2 o 5
  const [disponibilidadFiltro, setDisponibilidadFiltro] = useState(''); // '', 'inmediata', 'hoy'
  const [ubicacionUsuario, setUbicacionUsuario] = useState({ lat: null, lng: null });

  // 1. Obtener coordenadas del usuario al cargar la página
  useEffect(() => {
    async function cargarUbicacionCliente() {
      try {
        const resultado = await obtenerUsuarioActual();
        const usuario = resultado?.data?.usuario ?? resultado?.data?.user ?? resultado?.data ?? resultado;
        
        if (usuario && usuario.latitud && usuario.longitud) {
          setUbicacionUsuario({
            lat: Number(usuario.latitud),
            lng: Number(usuario.longitud)
          });
        }
      } catch {
      // Si no está logueado o no tiene dirección, se ignora silenciosamente
      console.log("Usuario sin sesión o sin ubicación guardada.");
    }
    }
    cargarUbicacionCliente();
  }, []);

  // 2. Cargar técnicos cada vez que cambien los filtros o la ubicación
  useEffect(() => {
    let activo = true;

    async function cargarTecnicosFiltrados() {
      try {
        setCargando(true);
        setError('');

        const filtros = {
          lat: ubicacionUsuario.lat,
          lng: ubicacionUsuario.lng,
          cercania: cercaniaKm,
          disponibilidad: disponibilidadFiltro
        };

        const datos = await obtenerTecnicos(filtros);

        if (activo) {
          setTecnicos(Array.isArray(datos) ? datos : []);
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'No se pudieron cargar los técnicos.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarTecnicosFiltrados();

    return () => {
      activo = false;
    };
  }, [cercaniaKm, disponibilidadFiltro, ubicacionUsuario]);

  // Manejadores de cambios en los checkboxes de cercanía (radio único o exclusión)
  const handleCercaniaChange = (km) => {
    setCercaniaKm(prev => (prev === km ? null : km));
  };

  // Manejadores de disponibilidad
  const handleDisponibilidadChange = (disp) => {
    setDisponibilidadFiltro(prev => (prev === disp ? '' : disp));
  };

  const tecnicosAdaptados = tecnicos.map((tecnico) => ({
    ...tecnico,
    especialidad: tecnico.especialidades?.length
      ? tecnico.especialidades.join(' · ')
      : 'Especialidad no registrada',

    disponibilidad: tecnico.acepta_reservas
      ? 'Acepta reservas'
      : 'Consultar disponibilidad',

    ubicacion: tecnico.zonas_atencion?.length > 0
      ? tecnico.zonas_atencion
          .map((zona) => zona.distrito)
          .join(' · ')
      : 'Zonas de atención no registradas',
  }));

  const tecnicosOrdenados = [...tecnicosAdaptados].sort((a, b) => {
    if (orden === 'calificacion') {
      return b.calificacion - a.calificacion;
    }
    if (orden === 'resenas') {
      return b.resenas - a.resenas;
    }
    return b.calificacion - a.calificacion || b.resenas - a.resenas;
  });

  return (
    <div className="technicians-container">
      <aside className="filters-sidebar">
        <h3>Filtros</h3>

        <div className="filter-group">
          <h4>Cercanía</h4>
          <label>
            <input 
              type="checkbox" 
              checked={cercaniaKm === 2} 
              onChange={() => handleCercaniaChange(2)} 
            />
            Menos de 2 km
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={cercaniaKm === 5} 
              onChange={() => handleCercaniaChange(5)} 
            />
            Menos de 5 km
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={cercaniaKm === null} 
              onChange={() => setCercaniaKm(null)} 
            />
            Todo Lima (Sin límite)
          </label>
          {!ubicacionUsuario.lat && cercaniaKm !== null && (
            <small style={{ color: '#d97706', display: 'block', marginTop: '4px' }}>
              ⚠️ Actualiza tu dirección con GPS en "Mi Cuenta" para usar el filtro de distancia.
            </small>
          )}
        </div>

        <div className="filter-group">
          <h4>Disponibilidad</h4>
          <label>
            <input 
              type="checkbox" 
              checked={disponibilidadFiltro === 'inmediata'} 
              onChange={() => handleDisponibilidadChange('inmediata')} 
            />
            Inmediata
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={disponibilidadFiltro === 'hoy'} 
              onChange={() => handleDisponibilidadChange('hoy')} 
            />
            Hoy (Acepta reservas)
          </label>
        </div>
      </aside>

      <main className="technicians-list-section">
        <div className="list-header">
          <h2>{tituloPagina}</h2>

          <div className="sort-wrapper">
            <label htmlFor="ordenar">Ordenar por:</label>
            <select
              id="ordenar"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="sort-select"
            >
              <option value="recomendados">Recomendados</option>
              <option value="calificacion">Mejor calificación</option>
              <option value="resenas">Más reseñas</option>
            </select>
          </div>
        </div>

        {cargando && (
          <p role="status">Cargando técnicos...</p>
        )}

        {!cargando && error && (
          <div role="alert" className="technicians-message">
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && tecnicosOrdenados.length === 0 && (
          <p className="technicians-message">
            No se encontraron técnicos con los filtros seleccionados.
          </p>
        )}

        {!cargando && !error && tecnicosOrdenados.length > 0 && (
          <div className="technicians-list">
            {tecnicosOrdenados.map((tecnico) => (
              <TechnicianCard
                key={tecnico.id}
                data={tecnico}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Technicians;