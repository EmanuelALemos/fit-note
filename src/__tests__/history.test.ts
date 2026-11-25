import { Database } from '@database/Database';
import { readHistory } from '@database/history';
import { createRepository, Repository } from '@database/repository';
import { inPeriod, metricValue, niceTicks, periodStart, recordId } from '@utils/history';

import { createMemoryDatabase } from '../testUtils/memoryDatabase';

let db: Database;
let repository: Repository;
let time: number;
let upperA: number;
let upperB: number;
let supino: number;

const days = (value: number) => { time += value * 86400000; };

function train(trainingId: number, sets: [number, number][], exerciseId = supino) {
    const plan = sets.map(([loadKg, reps]) => ({ loadKg, reps, done: false }));
    repository.workouts.start(trainingId);
    plan.forEach((_, index) => repository.workouts.setDone(trainingId, exerciseId, index + 1, true, plan));
    repository.workouts.finish(repository.workouts.getOpen()!.id);
}

beforeEach(() => {
    time = new Date('2026-08-01T10:00:00').getTime();
    db = createMemoryDatabase();
    repository = createRepository(db, () => new Date(time));
    upperA = repository.createTraining('Upper A');
    upperB = repository.createTraining('Upper B');
    supino = repository.addExercise(upperA, 'Supino');
    repository.addExercise(upperB, 'Supino');
});

test('histórico junta os treinos de todos os treinos, em ordem, só com séries concluídas', () => {
    train(upperA, [[20, 10], [20, 8]]);
    days(3);
    train(upperB, [[22.5, 9]]);
    days(1);
    repository.workouts.setDone(upperA, supino, 1, true, [{ loadKg: 25, reps: 5, done: false }, { loadKg: 25, reps: 5, done: false }]);

    const { sessions } = readHistory(db, supino);
    expect(sessions.map(session => [session.trainingName, session.sets])).toEqual([
        ['Upper A', [{ loadKg: 20, reps: 10 }, { loadKg: 20, reps: 8 }]],
        ['Upper B', [{ loadKg: 22.5, reps: 9 }]],
    ]); // o treino aberto fica de fora
});

test('a marca importada fica separada, fora do gráfico', () => {
    const imported = db.run("INSERT INTO session (kind, started_at, finished_at) VALUES ('imported', 'x', 'x')");
    db.run('INSERT INTO set_log (session_id, exercise_id, set_number, load_kg, reps) VALUES (?, ?, 1, 30, 6)', [imported, supino]);
    expect(readHistory(db, supino)).toEqual({ sessions: [], imported: { loadKg: 30, sets: [{ loadKg: 30, reps: 6 }] } });
});

test('treino excluído continua no histórico com o nome copiado', () => {
    train(upperB, [[20, 10]]);
    repository.removeTraining(upperB);
    expect(readHistory(db, supino).sessions[0].trainingName).toBe('Upper B');
});

test('métricas, período e recorde', () => {
    train(upperA, [[20, 10], [15, 12]]);
    days(40);
    train(upperA, [[22.5, 8], [22.5, 8]]);
    days(40);
    train(upperA, [[22.5, 8], [22.5, 8]]);
    const { sessions } = readHistory(db, supino);

    expect(sessions.map(session => metricValue(session, 'load'))).toEqual([20, 22.5, 22.5]);
    expect(sessions.map(session => metricValue(session, 'reps'))).toEqual([22, 16, 16]);
    expect(sessions.map(session => metricValue(session, 'volume'))).toEqual([380, 360, 360]);

    expect(recordId(sessions, 'load')).toBe(sessions[1].id); // empate: vale quem bateu primeiro
    expect(recordId(sessions, 'reps')).toBe(sessions[0].id);
    expect(recordId([], 'load')).toBeNull();

    const now = new Date(time);
    expect(inPeriod(sessions, '1M', now)).toHaveLength(1);
    expect(inPeriod(sessions, '3M', now)).toHaveLength(3);
    expect(periodStart('1A', now).getFullYear()).toBe(now.getFullYear() - 1);
});

test('marcas do eixo', () => {
    expect(niceTicks(18, 22.5)).toEqual([18, 20, 22, 24]);
    expect(niceTicks(0, 1000)).toEqual([0, 500, 1000]);
    expect(niceTicks(10, 10)).toEqual([9, 10, 11]);
    for (const [min, max] of [[18, 22.5], [0, 1000], [10, 10], [3.5, 3.75], [100, 4820]]) {
        const ticks = niceTicks(min, max);
        expect(ticks[0]).toBeLessThanOrEqual(min);
        expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
        expect(ticks.length).toBeLessThanOrEqual(6);
        expect(ticks.length).toBeGreaterThanOrEqual(2);
    }
});
