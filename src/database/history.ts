import { Database } from './Database';
import { LastMark, mainLoad, SetMark } from './workouts';

export interface HistorySession {
    id: number;
    finishedAt: string;
    trainingName: string;
    sets: SetMark[];
}

export interface ExerciseHistory {
    sessions: HistorySession[]; // treinos finalizados, do mais antigo ao mais recente
    imported: LastMark | null; // marca trazida do app antigo; fica fora do gráfico
}

// Só treinos finalizados e séries concluídas. Importadas não são treinos (seção 6 do plano).
export function readHistory(db: Database, exerciseId: number): ExerciseHistory {
    const rows = db.all<{ id: number; finishedAt: string; trainingName: string | null; loadKg: number; reps: number }>(`
        SELECT s.id, s.finished_at AS finishedAt, COALESCE(t.name, s.training_name) AS trainingName,
            l.load_kg AS loadKg, l.reps
        FROM session s
        JOIN set_log l ON l.session_id = s.id
        LEFT JOIN training t ON t.id = s.training_id
        WHERE l.exercise_id = ? AND s.kind = 'workout' AND s.finished_at IS NOT NULL AND l.completed_at IS NOT NULL
        ORDER BY s.finished_at, s.id, l.set_number
    `, [exerciseId]);

    const sessions: HistorySession[] = [];
    for (const row of rows) {
        let session = sessions[sessions.length - 1];
        if (session?.id !== row.id) {
            session = { id: row.id, finishedAt: row.finishedAt, trainingName: row.trainingName ?? 'Treino', sets: [] };
            sessions.push(session);
        }
        session.sets.push({ loadKg: row.loadKg, reps: row.reps });
    }

    const importedId = db.get<{ id: number }>(`
        SELECT s.id FROM session s
        WHERE s.kind = 'imported' AND EXISTS (SELECT 1 FROM set_log l WHERE l.session_id = s.id AND l.exercise_id = ?)
        ORDER BY s.finished_at DESC, s.id DESC LIMIT 1
    `, [exerciseId])?.id;

    const importedSets = importedId === undefined ? [] : db.all<SetMark>(
        'SELECT load_kg AS loadKg, reps FROM set_log WHERE session_id = ? AND exercise_id = ? ORDER BY set_number',
        [importedId, exerciseId]
    );

    return {
        sessions,
        imported: importedSets.length > 0 ? { loadKg: mainLoad(importedSets), sets: importedSets } : null,
    };
}
