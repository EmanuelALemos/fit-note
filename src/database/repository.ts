import { AppError } from '@utils/AppError';

import { Database } from './Database';
import { normalizeName } from './normalizeName';
import { isDatabaseEmpty } from './schema';

export interface Training {
    id: number;
    name: string;
}

export interface Exercise {
    id: number;
    name: string;
}

export interface ExerciseDetails extends Exercise {
    loadKg: number;
    repetitions: number[]; // uma posição por série
}

export type Repository = ReturnType<typeof createRepository>;

export function createRepository(db: Database) {
    const now = () => new Date().toISOString();

    function requireTraining(id: number) {
        if (!db.get('SELECT 1 FROM training WHERE id = ?', [id])) {
            throw new AppError('O treino especificado não foi encontrado.');
        }
    }

    function requireFreeTrainingName(name: string, exceptId: number) {
        if (db.get('SELECT 1 FROM training WHERE name = ? AND id <> ?', [name, exceptId])) {
            throw new AppError('Já existe um Treino cadastrado com esse nome.');
        }
    }

    function requireExercise(id: number) {
        const exercise = db.get<{ id: number; name: string; loadKg: number }>(
            'SELECT id, name, current_load_kg AS loadKg FROM exercise WHERE id = ?', [id]
        );

        if (!exercise) {
            throw new AppError('Exercício não encontrado.');
        }

        return exercise;
    }

    // Sessão importada ainda aberta: guarda as séries atuais do exercício até a Etapa 4.
    function currentSessionId(exerciseId: number): number | null {
        return db.get<{ id: number }>(`
            SELECT s.id FROM session s
            WHERE s.kind = 'imported' AND s.finished_at IS NULL
              AND EXISTS (SELECT 1 FROM set_log l WHERE l.session_id = s.id AND l.exercise_id = ?)
            ORDER BY s.id DESC LIMIT 1
        `, [exerciseId])?.id ?? null;
    }

    function lastSetNumber(sessionId: number, exerciseId: number): number {
        return db.get<{ last: number | null }>(
            'SELECT MAX(set_number) AS last FROM set_log WHERE session_id = ? AND exercise_id = ?',
            [sessionId, exerciseId]
        )?.last ?? 0;
    }

    return {
        isEmpty: () => isDatabaseEmpty(db),

        listTrainings: () => db.all<Training>('SELECT id, name FROM training ORDER BY position, id'),

        createTraining(name: string): number {
            return db.transaction(() => {
                requireFreeTrainingName(name, 0);
                return db.run(`
                    INSERT INTO training (name, position, created_at)
                    VALUES (?, (SELECT COALESCE(MAX(position) + 1, 0) FROM training), ?)
                `, [name, now()]);
            });
        },

        renameTraining(id: number, name: string) {
            db.transaction(() => {
                requireTraining(id);
                requireFreeTrainingName(name, id);
                db.run('UPDATE training SET name = ? WHERE id = ?', [name, id]);
            });
        },

        // Exercícios, cargas e sessões são compartilhados e continuam salvos.
        removeTraining(id: number) {
            db.run('DELETE FROM training WHERE id = ?', [id]);
        },

        listExercises: (trainingId: number) => db.all<Exercise>(`
            SELECT e.id, e.name FROM training_exercise t
            JOIN exercise e ON e.id = t.exercise_id
            WHERE t.training_id = ? ORDER BY t.position, e.id
        `, [trainingId]),

        // Reaproveita o exercício existente quando só mudam acentos, maiúsculas ou espaços.
        addExercise(trainingId: number, name: string): number {
            return db.transaction(() => {
                requireTraining(trainingId);

                const normalized = normalizeName(name);
                const existing = db.get<Exercise>(
                    'SELECT id, name FROM exercise WHERE name_normalized = ?', [normalized]
                );

                if (existing && db.get(
                    'SELECT 1 FROM training_exercise WHERE training_id = ? AND exercise_id = ?',
                    [trainingId, existing.id]
                )) {
                    throw new AppError(`O exercício ${existing.name} já está no treino.`);
                }

                const exerciseId = existing?.id ?? db.run(
                    'INSERT INTO exercise (name, name_normalized, created_at) VALUES (?, ?, ?)',
                    [name, normalized, now()]
                );

                db.run(`
                    INSERT INTO training_exercise (training_id, exercise_id, position)
                    VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM training_exercise WHERE training_id = ?))
                `, [trainingId, exerciseId, trainingId]);

                return exerciseId;
            });
        },

        removeExercise(trainingId: number, exerciseId: number) {
            db.run('DELETE FROM training_exercise WHERE training_id = ? AND exercise_id = ?', [trainingId, exerciseId]);
        },

        getExercise(id: number): ExerciseDetails {
            const exercise = requireExercise(id);
            const sessionId = currentSessionId(id);
            const sets = sessionId === null ? [] : db.all<{ reps: number }>(
                'SELECT reps FROM set_log WHERE session_id = ? AND exercise_id = ? ORDER BY set_number', [sessionId, id]
            );

            return { ...exercise, repetitions: sets.map(set => set.reps) };
        },

        setLoad(exerciseId: number, loadKg: number) {
            db.transaction(() => {
                requireExercise(exerciseId);
                db.run('UPDATE exercise SET current_load_kg = ? WHERE id = ?', [loadKg, exerciseId]);

                const sessionId = currentSessionId(exerciseId);
                if (sessionId !== null) {
                    db.run(
                        'UPDATE set_log SET load_kg = ? WHERE session_id = ? AND exercise_id = ?',
                        [loadKg, sessionId, exerciseId]
                    );
                }
            });
        },

        addSet(exerciseId: number) {
            db.transaction(() => {
                const { loadKg } = requireExercise(exerciseId);
                const sessionId = currentSessionId(exerciseId) ?? db.run(
                    "INSERT INTO session (kind, started_at) VALUES ('imported', ?)", [now()]
                );

                db.run(
                    'INSERT INTO set_log (session_id, exercise_id, set_number, load_kg, reps) VALUES (?, ?, ?, ?, 0)',
                    [sessionId, exerciseId, lastSetNumber(sessionId, exerciseId) + 1, loadKg]
                );
            });
        },

        removeLastSet(exerciseId: number) {
            db.transaction(() => {
                const sessionId = currentSessionId(exerciseId);
                if (sessionId === null) {
                    return;
                }

                db.run(
                    'DELETE FROM set_log WHERE session_id = ? AND exercise_id = ? AND set_number = ?',
                    [sessionId, exerciseId, lastSetNumber(sessionId, exerciseId)]
                );
                db.run(
                    'DELETE FROM session WHERE id = ? AND NOT EXISTS (SELECT 1 FROM set_log WHERE session_id = ?)',
                    [sessionId, sessionId]
                );
            });
        },

        changeRepetitions(exerciseId: number, setNumber: number, delta: number) {
            db.transaction(() => {
                const sessionId = currentSessionId(exerciseId);
                const set = sessionId === null ? null : db.get<{ id: number; reps: number }>(
                    'SELECT id, reps FROM set_log WHERE session_id = ? AND exercise_id = ? AND set_number = ?',
                    [sessionId, exerciseId, setNumber]
                );

                if (!set) {
                    throw new AppError('Série não encontrada.');
                }

                const reps = Math.max(0, set.reps + delta);
                db.run(
                    'UPDATE set_log SET reps = ?, completed_at = ? WHERE id = ?',
                    [reps, reps > 0 ? now() : null, set.id]
                );
            });
        },
    };
}
