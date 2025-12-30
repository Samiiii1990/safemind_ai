export const isNoiseMessage = (text: string): boolean => {
  const noisePatterns = [
    /mensajes nuevos/i,
    /Preparando copia de seguridad/i,
    /^Subiendo:/i,
    /Copia de seguridad en curso/i,
    /Checking for new messages/i,
    /Cifrado de extremo a extremo/i
  ];
  return noisePatterns.some(pattern => pattern.test(text));
};