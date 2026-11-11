const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Función auxiliar interna para evitar repetir código en las peticiones
async function peticionApi(endpoint, opciones = {}) {
  const token = localStorage.getItem('fixit_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...opciones.headers,
  };

  const respuesta = await fetch(`${API_URL}${endpoint}`, {
    ...opciones,
    headers,
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok || (resultado.success === false && !resultado.ok)) {
    throw new Error(resultado.message || 'Ocurrió un error en la solicitud.');
  }

  return resultado.data !== undefined ? resultado.data : resultado;
}

// ==========================================
// AUTENTICACIÓN Y USUARIOS
// ==========================================

export async function registrarUsuario(datos) {
  return await peticionApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function iniciarSesion(datos) {
  return await peticionApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerUsuarioActual() {
  const token = localStorage.getItem('fixit_token');
  if (!token) throw new Error('No hay una sesión iniciada.');
  return await peticionApi('/users/me', { method: 'GET' });
}

export async function actualizarUsuario(datos) {
  const token = localStorage.getItem('fixit_token');
  if (!token) throw new Error('No hay una sesión iniciada.');
  return await peticionApi('/users/me', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}

// ==========================================
// INCIDENCIAS Y CATÁLOGOS
// ==========================================

export async function obtenerCatalogosIncidencia() {
  return await peticionApi('/incidencias/catalogos', { method: 'GET' });
}

export async function obtenerMisIncidencias() {
  return await peticionApi('/incidencias/mis-incidencias', { method: 'GET' });
}

export async function obtenerDetalleIncidencia(id) {
  return await peticionApi(`/incidencias/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function registrarIncidencia(datos) {
  const token = localStorage.getItem('fixit_token');
  if (!token) throw new Error('Debes iniciar sesión para registrar una incidencia.');
  
  return await peticionApi('/incidencias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// ==========================================
// TRIAJE
// ==========================================

export async function obtenerPreguntasTriaje() {
  const token = localStorage.getItem('fixit_token');
  if (!token) throw new Error('Debes iniciar sesión para realizar el triaje.');
  
  return await peticionApi('/triaje/preguntas', { method: 'GET' });
}

export async function guardarRespuestasTriaje(incidenciaId, respuestas) {
  const token = localStorage.getItem('fixit_token');
  if (!token) throw new Error('Debes iniciar sesión para guardar el triaje.');

  const payload = typeof incidenciaId === 'object' && !respuestas 
    ? incidenciaId 
    : { incidencia_id: incidenciaId, respuestas };

  return await peticionApi('/triaje/respuestas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const registrarRespuestasTriaje = guardarRespuestasTriaje;

// ==========================================
// TÉCNICOS (ACTUALIZADO CON SOPORTE DE FILTROS)
// ==========================================

export async function obtenerTecnicos(filtros = {}) {
  const params = new URLSearchParams();

  if (filtros.lat !== undefined && filtros.lat !== null) params.append('lat', filtros.lat);
  if (filtros.lng !== undefined && filtros.lng !== null) params.append('lng', filtros.lng);
  if (filtros.cercania) params.append('cercania', filtros.cercania);
  if (filtros.disponibilidad) params.append('disponibilidad', filtros.disponibilidad);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return await peticionApi(`/tecnicos${queryStr}`, { method: 'GET' });
}