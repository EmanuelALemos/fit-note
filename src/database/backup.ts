import { EXERCISE_COLLECTION, TRAINING_COLLECTION } from '@storage/storageConfig';
import { AppError } from '@utils/AppError';

import { Database, SqlValue } from './Database';
import { applyImport } from './legacy/applyImport';
import { parseLegacyData } from './legacy/legacyData';
import { Duplicate, planImport } from './legacy/planImport';
import { CLOSE_IMPORTED, isDatabaseEmpty, SCHEMA_VERSION, TABLES } from './schema';

type Row = Record<string, SqlValue>;
type Tables = Record<typeof TABLES[number], Row[]>;

export interface BackupV2 {
    app: 'fit-note';
    version: 2;
    schemaVersion: number;
    exportedAt: string;
    tables: Tables;
}

export interface PreparedImport {
    trainings: number;
    exercises: number;
    sets: number;
    duplicates: Duplicate[];
    warnings: string[];
    apply: (db: Database) => void;
}

const INVALID = 'O arquivo não é um backup válido do Fit Note. Nada foi alterado.';

export function buildBackup(db: Database, now = new Date()): BackupV2 {
    return db.transaction(() => ({
        app: 'fit-note' as const,
        version: 2 as const,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: now.toISOString(),
        tables: Object.fromEntries(
            TABLES.map(table => [table, db.all<Row>(`SELECT * FROM ${table} ORDER BY rowid`)])
        ) as Tables,
    }));
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function prepareLegacy(asyncStorage: unknown): PreparedImport {
    if (!isObject(asyncStorage)) {
        throw new AppError(INVALID);
    }

    const read = (key: string) => {
        const value = asyncStorage[key] ?? null;
        if (value !== null && typeof value !== 'string') {
            throw new AppError(INVALID);
        }
        return value;
    };

    const plan = planImport(parseLegacyData(read(TRAINING_COLLECTION), read(EXERCISE_COLLECTION)));
    const sets = plan.exercises
        .flatMap(({ current, previous }) => [current, ...previous])
        .reduce((total, mark) => total + mark.repetitions.length, 0);

    return {
        trainings: plan.trainings.length,
        exercises: plan.exercises.length,
        sets,
        duplicates: plan.duplicates,
        warnings: plan.warnings,
        apply: db => applyImport(db, plan),
    };
}

function readTables(value: unknown): Tables {
    if (!isObject(value)) {
        throw new AppError(INVALID);
    }

    for (const table of TABLES) {
        const rows = value[table];
        const valid = Array.isArray(rows) && rows.every(row => isObject(row) && Object.values(row).every(
            cell => cell === null || typeof cell === 'string' || (typeof cell === 'number' && Number.isFinite(cell))
        ));

        if (!valid) {
            throw new AppError(INVALID);
        }
    }

    return value as Tables;
}

function restore(db: Database, tables: Tables, schemaVersion: number) {
    db.transaction(() => {
        if (!isDatabaseEmpty(db)) {
            throw new AppError('Só é possível importar com o app vazio. Nada foi alterado.');
        }

        db.run('DELETE FROM meta'); // só guarda a flag de migração; a do backup a substitui

        for (const table of TABLES) {
            const columns = db.all<{ name: string }>(`PRAGMA table_info(${table})`).map(column => column.name);

            for (const row of tables[table]) {
                const keys = Object.keys(row);
                // Nomes de coluna vão direto no SQL: só os do próprio esquema são aceitos.
                if (keys.length !== columns.length || !columns.every(column => keys.includes(column))) {
                    throw new AppError(INVALID);
                }

                db.run(
                    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
                    columns.map(column => row[column])
                );
            }

            const { total } = db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`)!;
            if (total !== tables[table].length) {
                throw new AppError(INVALID);
            }
        }

        if (schemaVersion < 2) {
            db.exec(CLOSE_IMPORTED);
        }
    });
}

// Valida o arquivo inteiro sem gravar nada; a gravação só acontece em apply().
export function prepareImport(text: string): PreparedImport {
    let file: unknown;

    try {
        file = JSON.parse(text.replace(/^﻿/, ''));
    } catch {
        throw new AppError(INVALID);
    }

    if (!isObject(file) || file.app !== 'fit-note') {
        throw new AppError(INVALID);
    }

    if (file.version === 1) {
        return prepareLegacy(file.asyncStorage);
    }

    if (file.version !== 2 || typeof file.schemaVersion !== 'number' || file.schemaVersion > SCHEMA_VERSION) {
        throw new AppError('O backup é de uma versão mais nova do app. Atualize o Fit Note.');
    }

    const { schemaVersion } = file;
    const tables = readTables(file.tables);

    return {
        trainings: tables.training.length,
        exercises: tables.exercise.length,
        sets: tables.set_log.length,
        duplicates: [],
        warnings: [],
        apply: db => restore(db, tables, schemaVersion),
    };
}
