export interface BackupDTO {
    app: 'fit-note';
    version: 1;
    exportedAt: string;
    // Texto bruto de cada chave, para preservar os dados mesmo se o JSON estiver inválido.
    asyncStorage: Record<string, string | null>;
}

export function backupBuild(
    entries: readonly (readonly [string, string | null])[],
    now: Date
): BackupDTO {
    const asyncStorage: Record<string, string | null> = {};

    for (const [key, value] of entries) {
        asyncStorage[key] = value;
    }

    return { app: 'fit-note', version: 1, exportedAt: now.toISOString(), asyncStorage };
}
