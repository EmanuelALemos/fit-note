import { AppError } from '@utils/AppError';

import { Database } from './Database';

export const SCHEMA_VERSION = 1;

// Na ordem em que as chaves estrangeiras permitem inserir.
export const TABLES = ['meta', 'exercise', 'training', 'training_exercise', 'session', 'set_log'] as const;

const VERSION_1 = `
CREATE TABLE meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
) STRICT;

CREATE TABLE exercise (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_normalized TEXT NOT NULL UNIQUE,
    current_load_kg REAL NOT NULL DEFAULT 0 CHECK (current_load_kg >= 0),
    rest_seconds INTEGER NOT NULL DEFAULT 90,
    target_reps_min INTEGER,
    target_reps_max INTEGER,
    default_sets INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL
) STRICT;

CREATE TABLE training (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL
) STRICT;

CREATE TABLE training_exercise (
    training_id INTEGER NOT NULL REFERENCES training (id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercise (id) ON DELETE RESTRICT,
    position INTEGER NOT NULL,
    PRIMARY KEY (training_id, exercise_id)
) STRICT;

-- 'imported' com finished_at NULL é o estado atual do exercício, editável até a Etapa 4.
CREATE TABLE session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    training_id INTEGER REFERENCES training (id) ON DELETE SET NULL,
    training_name TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('workout', 'imported')),
    started_at TEXT NOT NULL,
    finished_at TEXT
) STRICT;

CREATE UNIQUE INDEX session_one_open_workout ON session (kind) WHERE kind = 'workout' AND finished_at IS NULL;

CREATE TABLE set_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES session (id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercise (id) ON DELETE RESTRICT,
    set_number INTEGER NOT NULL CHECK (set_number > 0),
    load_kg REAL NOT NULL CHECK (load_kg >= 0),
    reps INTEGER NOT NULL CHECK (reps >= 0),
    completed_at TEXT,
    UNIQUE (session_id, exercise_id, set_number)
) STRICT;

CREATE INDEX set_log_exercise ON set_log (exercise_id, session_id);
`;

export function prepareSchema(db: Database) {
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    const version = db.get<{ user_version: number }>('PRAGMA user_version')!.user_version;

    if (version > SCHEMA_VERSION) {
        throw new AppError('Os dados são de uma versão mais nova do app. Atualize o Fit Note.');
    }

    if (version < 1) {
        db.transaction(() => {
            db.exec(VERSION_1);
            db.exec('PRAGMA user_version = 1');
        });
    }
}

export function isDatabaseEmpty(db: Database): boolean {
    return db.get(`
        SELECT 1 FROM (
            SELECT id FROM exercise UNION ALL SELECT id FROM training UNION ALL SELECT id FROM session
        ) LIMIT 1
    `) === null;
}
