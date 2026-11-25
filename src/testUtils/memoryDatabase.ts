import BetterSqlite from 'better-sqlite3';

import { Database, SqlValue } from '@database/Database';
import { prepareSchema } from '@database/schema';

export function createMemoryDatabase(): Database {
    const sqlite = new BetterSqlite(':memory:');

    const db: Database = {
        exec: sql => { sqlite.exec(sql); },
        run: (sql, params: SqlValue[] = []) => Number(sqlite.prepare(sql).run(params).lastInsertRowid),
        all: <T>(sql: string, params: SqlValue[] = []) => sqlite.prepare(sql).all(params) as T[],
        get: <T>(sql: string, params: SqlValue[] = []) => (sqlite.prepare(sql).get(params) as T | undefined) ?? null,
        transaction: <T>(task: () => T) => {
            if (sqlite.inTransaction) {
                throw new Error('Transação aninhada não é suportada no app.');
            }
            return sqlite.transaction(task)();
        },
    };

    prepareSchema(db);
    return db;
}
