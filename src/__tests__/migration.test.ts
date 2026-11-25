import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildBackup, prepareImport } from '@database/backup';
import { Database } from '@database/Database';
import { isMigrationDone } from '@database/legacy/applyImport';
import { migrateAsyncStorage } from '@database/legacy/migrateAsyncStorage';
import { createRepository, Repository } from '@database/repository';
import { isDatabaseEmpty, TABLES } from '@database/schema';
import { EXERCISE_COLLECTION, TRAINING_COLLECTION } from '@storage/storageConfig';
import { AppError } from '@utils/AppError';

import { createMemoryDatabase } from '../testUtils/memoryDatabase';

let db: Database;
let repository: Repository;

const exercise = (name: string, load: unknown, reps: unknown[], symbol = '°') => ({
    name, load, series: reps.map((repetitions, i) => ({ name: `${i + 1}${symbol} série`, repetitions, exerciseId: name })),
});

async function store(trainings: unknown, exercises: unknown) {
    const text = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value);
    if (trainings !== null) await AsyncStorage.setItem(TRAINING_COLLECTION, text(trainings));
    if (exercises !== null) await AsyncStorage.setItem(EXERCISE_COLLECTION, text(exercises));
}

const dump = (target: Database) => Object.fromEntries(TABLES.map(table => [table, target.all(`SELECT * FROM ${table}`)]));

// Tudo menos horários, que dependem do instante da execução.
const content = (target: Database) => JSON.stringify(dump(target)).replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, 'T');

const trainings = [
    { name: 'Upper B', exercicies: ['Remada', 'Supino'] },
    { name: 'Upper A', exercicies: ['Supino', null, 'Remada', 'Elevação'] },
];
const exercises = [
    exercise('Supino', 22.5, [10, 8, 7]),
    null,
    exercise('Elevação', 8, []),
    exercise('Remada', 40, [12, 0], 'ª'),
    exercise('Sem treino', 5, [3]),
];

beforeEach(async () => {
    await AsyncStorage.clear();
    db = createMemoryDatabase();
    repository = createRepository(db);
});

test('migra treinos, ordem, cargas e séries', async () => {
    await store(trainings, exercises);
    await migrateAsyncStorage(db);

    expect(repository.listTrainings().map(item => item.name)).toEqual(['Upper B', 'Upper A']);
    const [upperB, upperA] = repository.listTrainings();
    expect(repository.listExercises(upperB.id).map(item => item.name)).toEqual(['Remada', 'Supino']);

    const items = repository.listExercises(upperA.id);
    expect(items.map(item => item.name)).toEqual(['Supino', 'Remada', 'Elevação']);
    expect(items.map(item => repository.getExercise(item.id)).map(({ loadKg, repetitions }) => [loadKg, repetitions])).toEqual([
        [22.5, [10, 8, 7]], [40, [12, 0]], [8, []],
    ]);

    expect(db.all('SELECT kind, training_id FROM session')).toEqual(Array(3).fill({ kind: 'imported', training_id: null }));
    expect(db.get("SELECT current_load_kg AS load FROM exercise WHERE name = 'Sem treino'")).toEqual({ load: 5 });
});

test('é idempotente, mesmo depois de apagar os dados no app', async () => {
    await store(trainings, exercises);
    await migrateAsyncStorage(db);
    const first = JSON.stringify(dump(db));
    await migrateAsyncStorage(db);
    expect(JSON.stringify(dump(db))).toBe(first);

    db.exec('DELETE FROM set_log; DELETE FROM session; DELETE FROM training; DELETE FROM exercise');
    await migrateAsyncStorage(db);
    expect(isDatabaseEmpty(db)).toBe(true);
});

test('o AsyncStorage fica idêntico', async () => {
    await store(trainings, exercises);
    const keys = [TRAINING_COLLECTION, EXERCISE_COLLECTION];
    const before = await AsyncStorage.multiGet(keys);
    (AsyncStorage.setItem as jest.Mock).mockClear();
    await migrateAsyncStorage(db);
    expect(await AsyncStorage.multiGet(keys)).toEqual(before);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('falha no meio desfaz tudo, e a tentativa seguinte funciona', async () => {
    await store(trainings, exercises);
    db.exec("CREATE TRIGGER fail BEFORE INSERT ON training BEGIN SELECT RAISE(ABORT, 'queda'); END");
    await expect(migrateAsyncStorage(db)).rejects.toThrow('queda');
    expect(isDatabaseEmpty(db)).toBe(true);
    expect(isMigrationDone(db)).toBe(false);

    db.exec('DROP TRIGGER fail');
    await migrateAsyncStorage(db);
    expect(repository.listTrainings()).toHaveLength(2);
});

test('instalação nova não marca a migração', async () => {
    await migrateAsyncStorage(db);
    expect(isDatabaseEmpty(db)).toBe(true);
    expect(isMigrationDone(db)).toBe(false);
});

test('não migra com o banco em uso', async () => {
    await store(trainings, exercises);
    repository.createTraining('Novo');
    await migrateAsyncStorage(db);
    expect(repository.listTrainings().map(item => item.name)).toEqual(['Novo']);
});

test('aceita só uma das chaves', async () => {
    await store(null, exercises);
    await migrateAsyncStorage(db);
    expect(db.all('SELECT id FROM exercise')).toHaveLength(4);
    expect(repository.listTrainings()).toEqual([]);
});

test.each([
    ['{quebrado', exercises],
    [trainings, '[{"name":'],
    [{}, exercises],
    [trainings, [{ load: 1, series: [] }]],
    [trainings, [{ name: 'Supino', load: 1, series: 'x' }]],
    [[{ name: 'A', exercicies: 'x' }], exercises],
])('dados inválidos abortam sem gravar (%#)', async (badTrainings, badExercises) => {
    await store(badTrainings, badExercises);
    await expect(migrateAsyncStorage(db)).rejects.toBeInstanceOf(AppError);
    expect(isDatabaseEmpty(db)).toBe(true);
    expect(isMigrationDone(db)).toBe(false);
});

test('treino que cita exercício inexistente ignora só o vínculo', async () => {
    await store([{ name: 'A', exercicies: ['Fantasma', 'Supino'] }], [exercise('Supino', 10, [1])]);
    await migrateAsyncStorage(db);
    expect(repository.listExercises(repository.listTrainings()[0].id).map(item => item.name)).toEqual(['Supino']);
});

test('valores inválidos viram 0', async () => {
    await store([{ name: 'A', exercicies: ['X', 'Y'] }], [exercise('X', null, [-2, 1.5, 4]), exercise('Y', -3, [])]);
    await migrateAsyncStorage(db);
    const [x, y] = repository.listExercises(repository.listTrainings()[0].id).map(item => repository.getExercise(item.id));
    expect(x).toMatchObject({ loadKg: 0, repetitions: [0, 0, 4] });
    expect(y).toMatchObject({ loadKg: 0, repetitions: [] });
});

test('duplicatas: maior carga fica atual e a outra vira sessão importada anterior', async () => {
    await store(
        [{ name: 'A', exercicies: ['supino ', 'Supino'] }, { name: 'B', exercicies: ['SUPÍNO'] }],
        [exercise('supino ', 20, [10]), exercise('Supino', 30, [8, 8]), exercise('SUPÍNO', 25, [9])]
    );
    await migrateAsyncStorage(db);

    const [a, b] = repository.listTrainings();
    const [item] = repository.listExercises(a.id);
    expect(repository.listExercises(a.id)).toHaveLength(1);
    expect(repository.listExercises(b.id)).toEqual([item]);
    expect(repository.getExercise(item.id)).toEqual({ id: item.id, name: 'Supino', loadKg: 30, repetitions: [8, 8] });

    const sessions = db.all<{ load: number; open: number }>(`
        SELECT MAX(l.load_kg) AS load, s.finished_at IS NULL AS open
        FROM session s JOIN set_log l ON l.session_id = s.id GROUP BY s.id ORDER BY s.started_at
    `);
    expect(sessions).toEqual([{ load: 20, open: 0 }, { load: 25, open: 0 }, { load: 30, open: 1 }]);

    // Esvaziar a marca atual não traz a anterior de volta para a tela.
    repository.removeLastSet(item.id);
    repository.removeLastSet(item.id);
    expect(repository.getExercise(item.id).repetitions).toEqual([]);
    expect(db.all('SELECT id FROM session')).toHaveLength(2);
});

test('arquivo importado e AsyncStorage geram o mesmo banco', async () => {
    await store(trainings, exercises);
    await migrateAsyncStorage(db);

    const other = createMemoryDatabase();
    const prepared = prepareImport('﻿' + JSON.stringify({
        app: 'fit-note',
        version: 1,
        asyncStorage: {
            [TRAINING_COLLECTION]: JSON.stringify(trainings),
            [EXERCISE_COLLECTION]: JSON.stringify(exercises),
        },
    }));
    expect(prepared).toMatchObject({ trainings: 2, exercises: 4, sets: 6, duplicates: [] });
    expect(isDatabaseEmpty(other)).toBe(true); // preparar não grava
    prepared.apply(other);
    expect(content(other)).toBe(content(db));

    expect(() => prepared.apply(other)).toThrow(AppError); // banco não vazio
    expect(content(other)).toBe(content(db));
});

test('exportar e reimportar em banco vazio reproduz o mesmo banco', async () => {
    await store(trainings, exercises);
    await migrateAsyncStorage(db);
    repository.setLoad(repository.listExercises(1)[0].id, 41.25);

    const other = createMemoryDatabase();
    const prepared = prepareImport(JSON.stringify(buildBackup(db)));
    prepared.apply(other);
    expect(dump(other)).toEqual(dump(db));
    expect(() => prepared.apply(other)).toThrow(AppError);
    createRepository(other).createTraining('Depois'); // ids seguem funcionando
});

test.each<[string, (backup: any) => void]>([
    ['coluna desconhecida', b => { b.tables.exercise[0]['x); DROP TABLE exercise; --'] = 1; }],
    ['coluna faltando', b => { delete b.tables.exercise[0].name; }],
    ['vínculo órfão', b => { b.tables.training_exercise[0].exercise_id = 999; }],
    ['tipo errado', b => { b.tables.set_log[0].reps = 'dez'; }],
    ['nome nulo', b => { b.tables.exercise[0].name = null; }],
    ['nome duplicado', b => { b.tables.exercise[1].name_normalized = b.tables.exercise[0].name_normalized; }],
])('backup adulterado (%s) não grava nada', async (_, change) => {
    await store(trainings, exercises);
    await migrateAsyncStorage(db);
    const backup = JSON.parse(JSON.stringify(buildBackup(db)));
    change(backup);

    const other = createMemoryDatabase();
    expect(() => prepareImport(JSON.stringify(backup)).apply(other)).toThrow();
    expect(isDatabaseEmpty(other)).toBe(true);
    expect(other.all('SELECT * FROM meta')).toEqual([]);
});

test.each([
    'não é json', '[]', '{}', '{"app":"outro","version":1}', '{"app":"fit-note","version":1}',
    '{"app":"fit-note","version":2,"schemaVersion":1}', '{"app":"fit-note","version":2,"schemaVersion":99,"tables":{}}',
    '{"app":"fit-note","version":3}', '{"app":"fit-note","version":1,"asyncStorage":{"@fit-note: trainings":5}}',
])('arquivo inválido é recusado: %s', text => {
    expect(() => prepareImport(text)).toThrow(AppError);
});
