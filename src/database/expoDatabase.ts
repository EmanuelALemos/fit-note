import { openDatabaseSync } from 'expo-sqlite';

import { Database } from './Database';

export function openExpoDatabase(): Database {
    const db = openDatabaseSync('fitnote.db');

    return {
        exec: sql => db.execSync(sql),
        run: (sql, params = []) => db.runSync(sql, params).lastInsertRowId,
        all: <T>(sql: string, params: (string | number | null)[] = []) => db.getAllSync<T>(sql, params),
        get: <T>(sql: string, params: (string | number | null)[] = []) => db.getFirstSync<T>(sql, params),
        transaction: <T>(task: () => T) => {
            let result: T;
            db.withTransactionSync(() => { result = task(); });
            return result!;
        },
    };
}
