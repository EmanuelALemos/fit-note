import { AppError } from '@utils/AppError';

import { Database } from '../Database';
import { normalizeName } from '../normalizeName';
import { isDatabaseEmpty } from '../schema';
import { LegacyExercise } from './legacyData';
import { ImportPlan } from './planImport';

export const MIGRATION_FLAG = 'legacy_migration_done_at';

export function isMigrationDone(db: Database): boolean {
    return db.get('SELECT 1 FROM meta WHERE key = ?', [MIGRATION_FLAG]) !== null;
}

function count(db: Database, table: string): number {
    return db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`)!.total;
}

// Tudo ou nada: só grava com o banco vazio e confere as contagens antes de confirmar.
export function applyImport(db: Database, plan: ImportPlan, now = new Date()) {
    const currentAt = now.toISOString();

    db.transaction(() => {
        if (!isDatabaseEmpty(db)) {
            throw new AppError('Só é possível importar com o app vazio. Nada foi alterado.');
        }

        let sessions = 0;
        let sets = 0;

        function insertSession(exerciseId: number, mark: LegacyExercise, startedAt: string, finishedAt: string | null) {
            if (mark.repetitions.length === 0) {
                return;
            }

            const sessionId = db.run(
                "INSERT INTO session (kind, started_at, finished_at) VALUES ('imported', ?, ?)", [startedAt, finishedAt]
            );
            sessions++;

            mark.repetitions.forEach((reps, index) => {
                db.run(`
                    INSERT INTO set_log (session_id, exercise_id, set_number, load_kg, reps, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [sessionId, exerciseId, index + 1, mark.loadKg, reps, reps > 0 ? startedAt : null]);
                sets++;
            });
        }

        const exerciseIds = plan.exercises.map(({ current, previous }) => {
            const exerciseId = db.run(`
                INSERT INTO exercise (name, name_normalized, current_load_kg, created_at) VALUES (?, ?, ?, ?)
            `, [current.name, normalizeName(current.name), current.loadKg, currentAt]);

            previous.forEach((mark, index) => {
                // Antes da atual, para a "última vez" continuar sendo a maior carga.
                const at = new Date(now.getTime() - (previous.length - index) * 1000).toISOString();
                insertSession(exerciseId, mark, at, at);
            });
            insertSession(exerciseId, current, currentAt, null);

            return exerciseId;
        });

        let links = 0;

        plan.trainings.forEach((training, position) => {
            const trainingId = db.run(
                'INSERT INTO training (name, position, created_at) VALUES (?, ?, ?)', [training.name, position, currentAt]
            );

            training.exerciseIndexes.forEach((exerciseIndex, exercisePosition) => {
                db.run(
                    'INSERT INTO training_exercise (training_id, exercise_id, position) VALUES (?, ?, ?)',
                    [trainingId, exerciseIds[exerciseIndex], exercisePosition]
                );
                links++;
            });
        });

        const complete = count(db, 'exercise') === plan.exercises.length
            && count(db, 'training') === plan.trainings.length
            && count(db, 'training_exercise') === links
            && count(db, 'session') === sessions
            && count(db, 'set_log') === sets;

        if (!complete) {
            throw new AppError('A importação não conferiu com os dados de origem. Nada foi alterado.');
        }

        db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [MIGRATION_FLAG, currentAt]);
    });
}
