import { AppError } from '@utils/AppError';

import { Database } from './Database';

export const REST_MIN_SECONDS = 5;
export const REST_MAX_SECONDS = 30 * 60;

// Guarda o horário de término, não a contagem: vale com o app fechado ou a tela bloqueada.
export interface RestState {
    endsAt: string;
    totalSeconds: number;
    exerciseId: number;
    exerciseName: string;
    setLogId: number | null; // série cujo ✓ iniciou o descanso
}

const KEY = 'rest';

export function createRest(db: Database, clock: () => Date) {
    function read(): RestState | null {
        const row = db.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [KEY]);

        if (!row) {
            return null;
        }

        try {
            return JSON.parse(row.value) as RestState;
        } catch {
            return null;
        }
    }

    function write(state: RestState) {
        db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [KEY, JSON.stringify(state)]);
    }

    function clear() {
        db.run('DELETE FROM meta WHERE key = ?', [KEY]);
    }

    function remainingMs(state: RestState): number {
        return new Date(state.endsAt).getTime() - clock().getTime();
    }

    // null quando não há descanso ou ele já terminou.
    function get(): RestState | null {
        const state = read();
        return state && remainingMs(state) > 0 ? state : null;
    }

    function exercise(id: number) {
        const row = db.get<{ name: string; restSeconds: number }>(
            'SELECT name, rest_seconds AS restSeconds FROM exercise WHERE id = ?', [id]
        );

        if (!row) {
            throw new AppError('Exercício não encontrado.');
        }

        return row;
    }

    // Um novo descanso substitui o que estiver correndo.
    function start(exerciseId: number, setLogId: number | null): RestState {
        const { name, restSeconds } = exercise(exerciseId);
        const state = {
            endsAt: new Date(clock().getTime() + restSeconds * 1000).toISOString(),
            totalSeconds: restSeconds,
            exerciseId,
            exerciseName: name,
            setLogId,
        };

        write(state);
        return state;
    }

    return {
        get,
        start,
        clear,
        remainingMs,

        // Desmarcar a série cancela só o descanso que ela iniciou.
        cancelForSet(setLogId: number) {
            if (read()?.setLogId === setLogId) {
                clear();
            }
        },

        // Vale só para este descanso; o padrão do exercício não muda.
        adjust(seconds: number): RestState | null {
            const state = get();

            if (!state) {
                return null;
            }

            const endsAt = new Date(new Date(state.endsAt).getTime() + seconds * 1000);
            if (endsAt.getTime() <= clock().getTime()) {
                clear();
                return null;
            }

            const next = { ...state, endsAt: endsAt.toISOString(), totalSeconds: Math.max(1, state.totalSeconds + seconds) };
            write(next);
            return next;
        },

        getSeconds: (exerciseId: number) => exercise(exerciseId).restSeconds,

        setSeconds(exerciseId: number, seconds: number) {
            exercise(exerciseId);

            if (!Number.isInteger(seconds) || seconds < REST_MIN_SECONDS || seconds > REST_MAX_SECONDS) {
                throw new AppError('O descanso deve ficar entre 5 segundos e 30 minutos.');
            }

            db.run('UPDATE exercise SET rest_seconds = ? WHERE id = ?', [seconds, exerciseId]);
        },
    };
}

export type Rest = ReturnType<typeof createRest>;

// "90", "1:30" ou "1:30" com espaços. Retorna null se não entender.
export function parseRestSeconds(text: string): number | null {
    const value = text.trim();
    const clock = /^(\d{1,2}):(\d{2})$/.exec(value);

    if (clock) {
        return Number(clock[2]) < 60 ? Number(clock[1]) * 60 + Number(clock[2]) : null;
    }

    return /^\d{1,4}$/.test(value) ? Number(value) : null;
}

export function formatClock(seconds: number): string {
    const total = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
