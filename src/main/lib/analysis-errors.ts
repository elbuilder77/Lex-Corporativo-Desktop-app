function getMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '';
}

export function formatAnalyzeError(err: unknown): string {
  const message = getMessage(err);
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('timeout')) {
    return 'El análisis local de los documentos excedió el límite. Pruebe cargando menos archivos o reduciendo la resolución de los escaneos.';
  }

  if (normalized.includes('esta vacio') || normalized.includes('empty')) {
    return 'El PDF está vacío. Seleccione un archivo con contenido legible antes de iniciar el análisis.';
  }

  if (
    normalized.includes('no se pudo extraer texto seleccionable')
    || normalized.includes('selectable text')
    || normalized.includes('scanned')
  ) {
    return 'No se pudo extraer texto seleccionable del PDF. Si el documento está escaneado, aplique OCR antes de analizarlo.';
  }

  if (
    normalized.includes('password')
    || normalized.includes('encrypted')
    || normalized.includes('decrypt')
    || normalized.includes('contrasena')
    || normalized.includes('protegido')
    || normalized.includes('corrupt')
    || normalized.includes('damaged')
    || normalized.includes('invalid pdf')
  ) {
    return 'El PDF no puede leerse. Verifique que no esté protegido con contraseña, cifrado o dañado.';
  }

  if (normalized.includes('tipo de archivo no soportado')) {
    return message;
  }

  return `Error en el análisis de auditoría: ${message || 'Error desconocido'}`;
}
