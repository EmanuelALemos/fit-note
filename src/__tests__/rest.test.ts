import { Database } from '@database/Database';
import { createRepository, Repository } from '@database/repository';
import { formatClock, parseRestSeconds } from '@database/rest';
import { AppError } from '@utils/AppError';

import { createMemoryDatabase } from '../testUtils/memoryDatabase';

let db: Database;
let workouts: Repository['workouts'];
let time: number;
let training: number;
let supino: number;
let remada: number;

const seconds = (value: number) => { time += value * 1000; };
const left = () => {
    const state = workouts.rest.get();
    return state && Math.round(workouts.rest.remainingMs(state) / 1000);
};
const check = (exerciseId: number, setNumber: number, done = true) =>
    workouts.setDone(training, exerciseId, setNumber, done, workouts.getExercise(exerciseId).sets);

beforeEach(() => {
    time = new Date('2026-11-20T10:00:00').getTime();
    db = createMemoryDatabase();
    workouts = createRepository(db, () => new Date(time)).workouts;
    training = createRepository(db).createTraining('Upper A');
    const repository = createRepository(db, () => new Date(time));
    supino = repository.addExercise(training, 'Supino');
    remada = repository.addExercise(training, 'Remada');
    for (const id of [supino, remada]) {
        workouts.setDefaultSets(id, 3);
        workouts.setTarget(id, { min: 10, max: 12 });
    }
});

test('o ✓ inicia o descanso padrão do exercício (1:30)', () => {
    check(supino, 1);
    expect(workouts.rest.get()).toMatchObject({ totalSeconds: 90, exerciseId: supino, exerciseName: 'Supino' });
    expect(left()).toBe(90);
    seconds(89);
    expect(left()).toBe(1);
    seconds(1);
    expect(workouts.rest.get()).toBeNull();
});

test('desmarcar cancela só o descanso que aquela série iniciou', () => {
    check(supino, 1);
    seconds(30);
    check(supino, 2);
    check(supino, 1, false);
    expect(left()).toBe(90);
    check(supino, 2, false);
    expect(workouts.rest.get()).toBeNull();
});

test('novo ✓ reinicia o descanso, com o padrão do outro exercício', () => {
    workouts.rest.setSeconds(remada, 120);
    check(supino, 1);
    seconds(40);
    check(remada, 1);
    expect(workouts.rest.get()).toMatchObject({ exerciseId: remada, totalSeconds: 120 });
    expect(left()).toBe(120);
});

test('±15 s vale só para este descanso', () => {
    check(supino, 1);
    workouts.rest.adjust(15);
    expect(left()).toBe(105);
    expect(workouts.rest.get()!.totalSeconds).toBe(105);
    workouts.rest.adjust(-15);
    workouts.rest.adjust(-15);
    expect(left()).toBe(75);
    expect(workouts.rest.getSeconds(supino)).toBe(90);
    check(supino, 2);
    expect(left()).toBe(90);
});

test('−15 s no fim termina o descanso', () => {
    check(supino, 1);
    seconds(80);
    expect(workouts.rest.adjust(-15)).toBeNull();
    expect(workouts.rest.get()).toBeNull();
    expect(workouts.rest.adjust(15)).toBeNull();
});

test('pular, finalizar, descartar e o encerramento automático terminam o descanso', () => {
    check(supino, 1);
    workouts.rest.clear();
    expect(workouts.rest.get()).toBeNull();

    check(supino, 2);
    workouts.finish(workouts.getOpen()!.id);
    expect(workouts.rest.get()).toBeNull();

    check(supino, 1);
    workouts.discard(workouts.getOpen()!.id);
    expect(workouts.rest.get()).toBeNull();
});

test('iniciar sem treino, pelo botão, não cria treino', () => {
    workouts.rest.start(supino, null);
    expect(left()).toBe(90);
    expect(workouts.getOpen()).toBeNull();
});

test('descanso sobrevive a reabrir o app', () => {
    check(supino, 1);
    seconds(20);
    const again = createRepository(db, () => new Date(time)).workouts;
    expect(again.rest.get()).toMatchObject({ exerciseId: supino });
});

test('padrão do exercício: limites e formato', () => {
    workouts.rest.setSeconds(supino, 150);
    expect(workouts.getExercise(supino).restSeconds).toBe(150);
    for (const bad of [0, 4, 1801, 12.5]) expect(() => workouts.rest.setSeconds(supino, bad)).toThrow(AppError);

    expect(parseRestSeconds('90')).toBe(90);
    expect(parseRestSeconds(' 1:30 ')).toBe(90);
    expect(parseRestSeconds('2:05')).toBe(125);
    for (const bad of ['', '1:75', 'abc', '1,5', '-3']) expect(parseRestSeconds(bad)).toBeNull();
    expect([formatClock(90), formatClock(59.2), formatClock(0), formatClock(-3)]).toEqual(['1:30', '1:00', '0:00', '0:00']);
});

test('descanso guardado corrompido é ignorado', () => {
    db.run("INSERT INTO meta (key, value) VALUES ('rest', '{quebrado')");
    expect(workouts.rest.get()).toBeNull();
});
