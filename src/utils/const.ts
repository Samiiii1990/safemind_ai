// Palabras clave de alto riesgo que refuerzan la detección
export const HIGH_RISK_KEYWORDS = [
  'secreto', 'ocultar', 'esconder', 'sorpresa', 'regalo',
  'foto', 'video', 'desnudo', 'ropa', 'cuerpo',
  'encuentro', 'conocer', 'venir', 'casa', 'solo',
  'padres', 'viejos', 'mamá', 'papá', 'decir',
  'maduro', 'mayor', 'adulto', 'especial', 'diferente',
  'amor', 'novio', 'relación', 'gustar', 'hermosa'
];

// Patrones de contexto sospechoso
export const SUSPICIOUS_PATTERNS = [
  /no (le |les )?(digas|cuentes|comentes)/i,
  /entre (vos y yo|nosotros|tú y yo)/i,
  /(manda|envia|pasa).+(foto|video|imagen)/i,
  /(te |me )?gusta.+(cuerpo|foto|verse)/i,
  /veni.+(solo|sola|casa|encuentro)/i,
  /(sos|eres|te ves).+(linda|hermosa|bonita|sexy)/i,
  /esto.+(secreto|privado|nuestro)/i
];