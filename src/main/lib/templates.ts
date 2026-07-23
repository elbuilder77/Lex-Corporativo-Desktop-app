export function isPagareRequest(req: string): boolean {
  return /pagar[eé]/i.test(req);
}

export function isEscritoSatRequest(req: string): boolean {
  return /escrito|aclaraci[oó]n|al sat/i.test(req);
}
