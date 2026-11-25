// Só para detectar duplicatas; o nome exibido fica como foi digitado.
export function normalizeName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}
