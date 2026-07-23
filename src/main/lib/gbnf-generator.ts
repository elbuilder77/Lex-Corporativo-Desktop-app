/**
 * Genera una gramática GBNF estricta para forzar al modelo local a emitir JSON plano.
 * @param keys Arreglo de llaves requeridas por la plantilla Handlebars.
 */
export function generateFlatJsonGrammar(keys: string[]): string {
  if (!keys || keys.length === 0) return 'root ::= "{}" ws';

  const rootReglas = keys.map((key, index) => {
    const isLast = index === keys.length - 1;
    // Obliga a escribir la llave, dos puntos, y un valor string, seguido de coma (si no es el último)
    return `"\\\"${key}\\\":" ws string` + (isLast ? `` : ` "," ws `);
  }).join('');

  return `
# Regla principal: Obliga a abrir llaves, escribir las propiedades y cerrar llaves.
root ::= "{" ws ${rootReglas} "}" ws

# Definición de un String válido (escapando comillas internas)
string ::= "\\\"" [^"]* "\\\""

# Definición de espacios en blanco (ignora saltos de línea y tabulaciones para dar formato)
ws ::= [ \\t\\n]*
  `.trim();
}
