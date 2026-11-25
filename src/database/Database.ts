export type SqlValue = string | number | null;

// API síncrona: cada chamada termina antes da próxima, então toques rápidos não se cruzam.
// Implementada pelo expo-sqlite no app e pelo better-sqlite3 nos testes.
export interface Database {
    exec(sql: string): void;
    run(sql: string, params?: SqlValue[]): number; // id da linha inserida
    all<T>(sql: string, params?: SqlValue[]): T[];
    get<T>(sql: string, params?: SqlValue[]): T | null;
    transaction<T>(task: () => T): T; // não pode ser aninhada
}
