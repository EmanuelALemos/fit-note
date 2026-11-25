import { AppError } from '@utils/AppError';

import { Database } from './Database';

// Sem nenhum ✓ por esse tempo, o treino é encerrado no horário da última série.
export const IDLE_LIMIT_MS = 3 * 60 * 60 * 1000;

export interface OpenWorkout {
    id: number;
    trainingId: number | null;
    trainingName: string;
    startedAt: string;
    completedSets: number;
}

export interface SetMark {
    loadKg: number;
    reps: number;
}

export interface PlannedSet extends SetMark {
    done: boolean;
}

export interface LastMark {
    loadKg: number; // a mais usada nas séries
    sets: SetMark[];
}

export interface WorkoutExercise {
    id: number;
    name: string;
    loadKg: number;
    targetMin: number | null;
    targetMax: number | null;
    last: LastMark | null;
    sets: PlannedSet[];
    saved: boolean; // false: sets é só uma sugestão, nada foi gravado no treino aberto
}

export interface WorkoutSummary {
    trainingName: string;
    startedAt: string;
    totals: Totals;
    previous: Totals | null; // treino anterior do mesmo nome
    records: { name: string; loadKg: number; reps: number }[];
    comparison: { name: string; loadDelta: number; repsDelta: number }[];
}

export interface Totals {
    durationMs: number;
    exercises: number;
    sets: number;
    volumeKg: number;
    reps: number;
}

export function mainLoad(sets: SetMark[]): number {
    const counts = new Map<number, number>();
    sets.forEach(({ loadKg }) => counts.set(loadKg, (counts.get(loadKg) ?? 0) + 1));

    return [...counts].sort(([loadA, a], [loadB, b]) => b - a || loadB - loadA)[0]?.[0] ?? 0;
}

function isBetter(a: SetMark, b: SetMark): boolean {
    return a.loadKg > b.loadKg || (a.loadKg === b.loadKg && a.reps > b.reps);
}

const sumReps = (sets: SetMark[]) => sets.reduce((total, set) => total + set.reps, 0);

export function createWorkouts(db: Database, clock: () => Date) {
    const now = () => clock().toISOString();

    function readOpen(): OpenWorkout | null {
        return db.get<OpenWorkout>(`
            SELECT s.id, s.training_id AS trainingId, s.started_at AS startedAt,
                COALESCE(t.name, s.training_name, 'Treino') AS trainingName,
                (SELECT COUNT(*) FROM set_log l WHERE l.session_id = s.id AND l.completed_at IS NOT NULL) AS completedSets
            FROM session s LEFT JOIN training t ON t.id = s.training_id
            WHERE s.kind = 'workout' AND s.finished_at IS NULL
        `);
    }

    function lastCompletedAt(sessionId: number): string | null {
        return db.get<{ at: string | null }>(
            'SELECT MAX(completed_at) AS at FROM set_log WHERE session_id = ?', [sessionId]
        )!.at;
    }

    // Só as séries com ✓ ficam no histórico; sem nenhuma, o treino não é guardado.
    function close(sessionId: number, finishedAt: string): boolean {
        db.run('DELETE FROM set_log WHERE session_id = ? AND completed_at IS NULL', [sessionId]);

        if (lastCompletedAt(sessionId) === null) {
            db.run('DELETE FROM session WHERE id = ?', [sessionId]);
            return false;
        }

        db.run(
            'UPDATE exercise SET default_sets = NULL WHERE id IN (SELECT exercise_id FROM set_log WHERE session_id = ?)',
            [sessionId]
        );
        db.run(`
            UPDATE session SET finished_at = ?,
                training_name = COALESCE((SELECT name FROM training WHERE id = session.training_id), training_name)
            WHERE id = ?
        `, [finishedAt, sessionId]);
        return true;
    }

    function staleSince(open: OpenWorkout): string | null {
        const lastActivity = lastCompletedAt(open.id) ?? open.startedAt;
        const idle = clock().getTime() - new Date(lastActivity).getTime();
        return idle >= IDLE_LIMIT_MS ? lastActivity : null;
    }

    // Para usar dentro de uma transação já aberta.
    function currentInTransaction(): OpenWorkout | null {
        const open = readOpen();
        const stale = open && staleSince(open);

        if (open && stale) {
            close(open.id, stale);
            return null;
        }

        return open;
    }

    function getOpen(): OpenWorkout | null {
        const open = readOpen();
        return open && staleSince(open) ? db.transaction(currentInTransaction) : open;
    }

    function requireOpen(sessionId: number): OpenWorkout {
        const open = readOpen();

        if (!open || open.id !== sessionId) {
            throw new AppError('Este treino já foi encerrado.');
        }

        return open;
    }

    function insertSession(trainingId: number): number {
        const training = db.get<{ name: string }>('SELECT name FROM training WHERE id = ?', [trainingId]);

        if (!training) {
            throw new AppError('O treino especificado não foi encontrado.');
        }

        return db.run(
            "INSERT INTO session (training_id, training_name, kind, started_at) VALUES (?, ?, 'workout', ?)",
            [trainingId, training.name, now()]
        );
    }

    function readSets(sessionId: number, exerciseId: number): PlannedSet[] {
        return db.all<{ loadKg: number; reps: number; done: number }>(`
            SELECT load_kg AS loadKg, reps, completed_at IS NOT NULL AS done FROM set_log
            WHERE session_id = ? AND exercise_id = ? ORDER BY set_number
        `, [sessionId, exerciseId]).map(set => ({ ...set, done: set.done === 1 }));
    }

    function getLast(exerciseId: number): LastMark | null {
        const session = db.get<{ id: number; kind: string }>(`
            SELECT s.id, s.kind FROM session s
            WHERE s.finished_at IS NOT NULL
              AND EXISTS (SELECT 1 FROM set_log l WHERE l.session_id = s.id AND l.exercise_id = ?)
            ORDER BY s.kind = 'workout' DESC, s.finished_at DESC, s.id DESC LIMIT 1
        `, [exerciseId]);

        if (!session) {
            return null;
        }

        const sets = readSets(session.id, exerciseId).map(({ loadKg, reps }) => ({ loadKg, reps }));
        return { loadKg: mainLoad(sets), sets };
    }

    function requireExercise(id: number) {
        const exercise = db.get<{
            id: number; name: string; loadKg: number; targetMin: number | null; targetMax: number | null; defaultSets: number | null;
        }>(`
            SELECT id, name, current_load_kg AS loadKg, target_reps_min AS targetMin,
                target_reps_max AS targetMax, default_sets AS defaultSets
            FROM exercise WHERE id = ?
        `, [id]);

        if (!exercise) {
            throw new AppError('Exercício não encontrado.');
        }

        return exercise;
    }

    function getExercise(id: number): WorkoutExercise {
        const { defaultSets, ...exercise } = requireExercise(id);
        const open = getOpen();
        const last = getLast(id);
        const saved = open ? readSets(open.id, id) : [];

        if (saved.length > 0) {
            return { ...exercise, last, sets: saved, saved: true };
        }

        // Sugestão: repetir a última vez. Um ✓ basta quando foi igual.
        const count = defaultSets ?? last?.sets.length ?? 0;
        const sets = Array.from({ length: count }, (_, index) => ({
            loadKg: exercise.loadKg,
            reps: (last?.sets[index] ?? last?.sets[last.sets.length - 1])?.reps ?? exercise.targetMin ?? 0,
            done: false,
        }));

        return { ...exercise, last, sets, saved: false };
    }

    // Grava a sugestão da tela antes da primeira alteração no treino aberto.
    function savePlan(sessionId: number, exerciseId: number, plan: PlannedSet[]) {
        if (readSets(sessionId, exerciseId).length > 0) {
            return;
        }

        plan.forEach((set, index) => db.run(
            'INSERT INTO set_log (session_id, exercise_id, set_number, load_kg, reps) VALUES (?, ?, ?, ?, ?)',
            [sessionId, exerciseId, index + 1, set.loadKg, set.reps]
        ));
    }

    function editOpen(exerciseId: number, plan: PlannedSet[], change: (sessionId: number, sets: PlannedSet[]) => void) {
        db.transaction(() => {
            requireExercise(exerciseId);
            const open = readOpen();

            if (!open || staleSince(open)) {
                throw new AppError('O treino foi encerrado. Conclua uma série para iniciar outro.');
            }

            savePlan(open.id, exerciseId, plan);
            change(open.id, readSets(open.id, exerciseId));
        });
    }

    function requireSet(sets: PlannedSet[], setNumber: number): PlannedSet {
        const set = sets[setNumber - 1];

        if (!set) {
            throw new AppError('Série não encontrada.');
        }

        return set;
    }

    function updateSet(sessionId: number, exerciseId: number, setNumber: number, assignment: string, value: string | number | null) {
        db.run(
            `UPDATE set_log SET ${assignment} = ? WHERE session_id = ? AND exercise_id = ? AND set_number = ?`,
            [value, sessionId, exerciseId, setNumber]
        );
    }

    function sessionSets(sessionId: number) {
        const byExercise = new Map<number, { name: string; sets: SetMark[] }>();

        db.all<{ exerciseId: number; name: string; loadKg: number; reps: number }>(`
            SELECT l.exercise_id AS exerciseId, e.name, l.load_kg AS loadKg, l.reps
            FROM set_log l JOIN exercise e ON e.id = l.exercise_id
            WHERE l.session_id = ? AND l.completed_at IS NOT NULL ORDER BY l.completed_at, l.id
        `, [sessionId]).forEach(({ exerciseId, name, loadKg, reps }) => {
            const entry = byExercise.get(exerciseId) ?? { name, sets: [] };
            entry.sets.push({ loadKg, reps });
            byExercise.set(exerciseId, entry);
        });

        return byExercise;
    }

    function totals(session: { startedAt: string; finishedAt: string }, byExercise: Map<number, { sets: SetMark[] }>): Totals {
        const sets = [...byExercise.values()].flatMap(entry => entry.sets);

        return {
            durationMs: Math.max(0, new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()),
            exercises: byExercise.size,
            sets: sets.length,
            volumeKg: sets.reduce((total, set) => total + set.loadKg * set.reps, 0),
            reps: sumReps(sets),
        };
    }

    return {
        getOpen,
        getLast,
        getExercise,

        start(trainingId: number): number {
            return db.transaction(() => {
                const open = currentInTransaction();

                if (open) {
                    throw new AppError(`${open.trainingName} está em andamento. Finalize ou descarte antes.`);
                }

                return insertSession(trainingId);
            });
        },

        // false: nenhuma série concluída, então nada foi guardado.
        finish(sessionId: number): boolean {
            return db.transaction(() => {
                requireOpen(sessionId);
                return close(sessionId, now());
            });
        },

        discard(sessionId: number) {
            db.transaction(() => {
                requireOpen(sessionId);
                db.run('DELETE FROM session WHERE id = ?', [sessionId]);
            });
        },

        // O primeiro ✓ inicia o treino. Com outro treino aberto, a série entra nele.
        setDone(trainingId: number, exerciseId: number, setNumber: number, done: boolean, plan: PlannedSet[]) {
            db.transaction(() => {
                requireExercise(exerciseId);
                const open = currentInTransaction();

                if (!open && !done) {
                    throw new AppError('O treino foi encerrado.');
                }

                const sessionId = open?.id ?? insertSession(trainingId);
                savePlan(sessionId, exerciseId, plan);
                const set = requireSet(readSets(sessionId, exerciseId), setNumber);

                if (done && set.reps === 0) {
                    throw new AppError('Informe as repetições antes de concluir a série.');
                }

                if (done !== set.done) {
                    updateSet(sessionId, exerciseId, setNumber, 'completed_at', done ? now() : null);
                }
            });
        },

        changeRepetitions(exerciseId: number, setNumber: number, delta: number, plan: PlannedSet[]) {
            editOpen(exerciseId, plan, (sessionId, sets) => {
                const set = requireSet(sets, setNumber);
                // Série concluída não pode ficar com zero.
                const reps = Math.max(set.done ? 1 : 0, set.reps + delta);
                updateSet(sessionId, exerciseId, setNumber, 'reps', reps);
            });
        },

        setSetLoad(exerciseId: number, setNumber: number, loadKg: number, plan: PlannedSet[]) {
            editOpen(exerciseId, plan, (sessionId, sets) => {
                requireSet(sets, setNumber);
                updateSet(sessionId, exerciseId, setNumber, 'load_kg', loadKg);
            });
        },

        addSet(exerciseId: number, plan: PlannedSet[]) {
            editOpen(exerciseId, plan, (sessionId, sets) => {
                const { loadKg, targetMin } = requireExercise(exerciseId);
                db.run(
                    'INSERT INTO set_log (session_id, exercise_id, set_number, load_kg, reps) VALUES (?, ?, ?, ?, ?)',
                    [sessionId, exerciseId, sets.length + 1, loadKg, sets[sets.length - 1]?.reps ?? targetMin ?? 0]
                );
            });
        },

        removeLastSet(exerciseId: number, plan: PlannedSet[]) {
            editOpen(exerciseId, plan, (sessionId, sets) => {
                db.run(
                    'DELETE FROM set_log WHERE session_id = ? AND exercise_id = ? AND set_number = ?',
                    [sessionId, exerciseId, sets.length]
                );
            });
        },

        // Sem treino aberto, guarda só quantas séries planejar; vale até o próximo treino com o exercício.
        setDefaultSets(exerciseId: number, count: number) {
            requireExercise(exerciseId);
            db.run('UPDATE exercise SET default_sets = ? WHERE id = ?', [Math.max(0, count), exerciseId]);
        },

        // Séries concluídas ou com carga própria não mudam.
        setLoad(exerciseId: number, loadKg: number) {
            db.transaction(() => {
                const { loadKg: previous } = requireExercise(exerciseId);
                const open = currentInTransaction();
                db.run('UPDATE exercise SET current_load_kg = ? WHERE id = ?', [loadKg, exerciseId]);

                if (open) {
                    db.run(`
                        UPDATE set_log SET load_kg = ?
                        WHERE session_id = ? AND exercise_id = ? AND completed_at IS NULL AND load_kg = ?
                    `, [loadKg, open.id, exerciseId, previous]);
                }
            });
        },

        setTarget(exerciseId: number, target: { min: number; max: number } | null) {
            requireExercise(exerciseId);
            db.run(
                'UPDATE exercise SET target_reps_min = ?, target_reps_max = ? WHERE id = ?',
                [target?.min ?? null, target?.max ?? null, exerciseId]
            );
        },

        getSummary(sessionId: number): WorkoutSummary {
            const session = db.get<{ trainingId: number | null; trainingName: string | null; startedAt: string; finishedAt: string }>(`
                SELECT training_id AS trainingId, training_name AS trainingName, started_at AS startedAt, finished_at AS finishedAt
                FROM session WHERE id = ? AND kind = 'workout' AND finished_at IS NOT NULL
            `, [sessionId]);

            if (!session) {
                throw new AppError('Treino não encontrado.');
            }

            const previousSession = db.get<{ id: number; startedAt: string; finishedAt: string }>(`
                SELECT id, started_at AS startedAt, finished_at AS finishedAt FROM session
                WHERE kind = 'workout' AND training_id = ? AND finished_at IS NOT NULL AND id < ?
                ORDER BY id DESC LIMIT 1
            `, [session.trainingId, sessionId]);

            const today = sessionSets(sessionId);
            const before = previousSession ? sessionSets(previousSession.id) : new Map<number, { name: string; sets: SetMark[] }>();
            const records: WorkoutSummary['records'] = [];
            const comparison: WorkoutSummary['comparison'] = [];

            today.forEach(({ name, sets }, exerciseId) => {
                const best = sets.reduce((a, b) => isBetter(b, a) ? b : a);
                const oldBest = db.get<SetMark>(`
                    SELECT l.load_kg AS loadKg, l.reps FROM set_log l JOIN session s ON s.id = l.session_id
                    WHERE l.exercise_id = ? AND s.id < ? AND s.finished_at IS NOT NULL AND l.reps > 0
                    ORDER BY l.load_kg DESC, l.reps DESC LIMIT 1
                `, [exerciseId, sessionId]);

                // A primeira marca de um exercício não é recorde.
                if (oldBest && isBetter(best, oldBest)) {
                    records.push({ name, ...best });
                }

                const old = before.get(exerciseId);
                if (old) {
                    comparison.push({
                        name,
                        loadDelta: mainLoad(sets) - mainLoad(old.sets),
                        repsDelta: sumReps(sets) - sumReps(old.sets),
                    });
                }
            });

            return {
                trainingName: session.trainingName ?? 'Treino',
                startedAt: session.startedAt,
                totals: totals(session, today),
                previous: previousSession && totals(previousSession, before),
                records,
                comparison,
            };
        },
    };
}
