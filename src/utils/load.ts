// Aceita "12", "12,5" e "12.5". Retorna null se não for uma carga válida.
export function parseLoad(text: string): number | null {
    const normalized = text.trim().replace(',', '.');

    return /^\d+(\.\d*)?$/.test(normalized) ? Number(normalized) : null;
}

export function formatLoad(load: number): string {
    return String(load).replace('.', ',');
}
