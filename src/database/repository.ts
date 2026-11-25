import { AppError } from '@utils/AppError';

import { Database } from './Database';
import { normalizeName } from './normalizeName';
import { isDatabaseEmpty } from './schema';
import { createWorkouts } from './workouts';

export interface Training {
    id: number;
    name: string;
}

export interface TrainingSummary extends Training {
    exerciseCount: number;
    lastWorkoutAt: string | null;
}

export interface Exercise {
    id: number;
    name: string;
}

export type Repository = ReturnType<typeof createRepository>;

function requireSameItems(saved: { id: number }[], ids: number[]) {
    const unique = new Set(ids);

    if (unique.size !== ids.length || saved.length !== ids.length || saved.some(item => !unique.has(item.id))) {
        throw new AppError('A lista mudou. Tente reordenar novamente.');
    }
}

export function createRepository(db: Database, clock = () => new Date()) {
    const now = () => clock().toISOString();
    const workouts = createWorkouts(db, clock);

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
        const exercise = db.get('SELECT 1 FROM exercise WHERE id = ?', [id]);

        if (!exercise) {
            throw new AppError('Exercício não encontrado.');
        }
    }

    return {
        workouts,

        isEmpty: () => isDatabaseEmpty(db),

        listTrainings: () => db.all<TrainingSummary>(`
            SELECT id, name,
                (SELECT COUNT(*) FROM training_exercise WHERE training_id = training.id) AS exerciseCount,
                (SELECT MAX(started_at) FROM session WHERE training_id = training.id
                    AND kind = 'workout' AND finished_at IS NOT NULL) AS lastWorkoutAt
            FROM training ORDER BY position, id
        `),

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

        reorderTrainings(ids: number[]) {
            db.transaction(() => {
                requireSameItems(db.all<{ id: number }>('SELECT id FROM training'), ids);
                ids.forEach((id, position) => db.run('UPDATE training SET position = ? WHERE id = ?', [position, id]));
            });
        },

        // Exercícios, cargas e sessões são compartilhados e continuam salvos.
        removeTraining(id: number) {
            if (workouts.getOpen()?.trainingId === id) {
                throw new AppError('Este treino está em andamento. Finalize ou descarte antes de excluir.');
            }

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

        countTrainingsWithExercise: (exerciseId: number) => db.get<{ total: number }>(
            'SELECT COUNT(*) AS total FROM training_exercise WHERE exercise_id = ?', [exerciseId]
        )!.total,

        // O exercício é único: o nome muda em todos os treinos.
        renameExercise(id: number, name: string) {
            db.transaction(() => {
                requireExercise(id);

                const normalized = normalizeName(name);
                const other = db.get<Exercise>(
                    'SELECT id, name FROM exercise WHERE name_normalized = ? AND id <> ?', [normalized, id]
                );

                if (other) {
                    throw new AppError(`Já existe um exercício chamado ${other.name}.`);
                }

                db.run('UPDATE exercise SET name = ?, name_normalized = ? WHERE id = ?', [name, normalized, id]);
            });
        },

        reorderExercises(trainingId: number, ids: number[]) {
            db.transaction(() => {
                requireSameItems(db.all<{ id: number }>(
                    'SELECT exercise_id AS id FROM training_exercise WHERE training_id = ?', [trainingId]
                ), ids);
                ids.forEach((id, position) => db.run(
                    'UPDATE training_exercise SET position = ? WHERE training_id = ? AND exercise_id = ?',
                    [position, trainingId, id]
                ));
            });
        },

        removeExercise(trainingId: number, exerciseId: number) {
            db.run('DELETE FROM training_exercise WHERE training_id = ? AND exercise_id = ?', [trainingId, exerciseId]);
        },
    };
}
