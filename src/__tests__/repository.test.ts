import { Database } from '@database/Database';
import { createRepository, Repository } from '@database/repository';
import { prepareSchema } from '@database/schema';
import { AppError } from '@utils/AppError';

import { createMemoryDatabase } from '../testUtils/memoryDatabase';

let db: Database;
let repository: Repository;
let upperA: number;
let supino: number;

beforeEach(() => {
    db = createMemoryDatabase();
    repository = createRepository(db);
    upperA = repository.createTraining('Upper A');
    supino = repository.addExercise(upperA, 'Supino');
});

test('20 toques em + somam 20, e nunca fica negativo', () => {
    repository.addSet(supino);
    for (let i = 0; i < 20; i++) repository.changeRepetitions(supino, 1, 1);
    expect(repository.getExercise(supino).repetitions).toEqual([20]);
    for (let i = 0; i < 25; i++) repository.changeRepetitions(supino, 1, -1);
    expect(repository.getExercise(supino).repetitions).toEqual([0]);
});

test('séries entram e saem pelo fim; sem séries não sobra sessão vazia', () => {
    repository.addSet(supino);
    repository.addSet(supino);
    repository.changeRepetitions(supino, 1, 8);
    repository.removeLastSet(supino);
    expect(repository.getExercise(supino).repetitions).toEqual([8]);
    repository.removeLastSet(supino);
    repository.removeLastSet(supino);
    expect(repository.getExercise(supino).repetitions).toEqual([]);
    expect(db.all('SELECT * FROM session')).toEqual([]);
});

test('carga decimal é gravada e herdada pelas séries', () => {
    repository.addSet(supino);
    repository.setLoad(supino, 12.5);
    repository.addSet(supino);
    expect(repository.getExercise(supino).loadKg).toBe(12.5);
    expect(db.all('SELECT load_kg FROM set_log')).toEqual([{ load_kg: 12.5 }, { load_kg: 12.5 }]);
});

test('carga é mantida sem nenhuma série', () => {
    repository.setLoad(supino, 30);
    expect(repository.getExercise(supino)).toEqual({ id: supino, name: 'Supino', loadKg: 30, repetitions: [] });
});

test('exercício é compartilhado entre treinos, ignorando acentos, maiúsculas e espaços', () => {
    const upperB = repository.createTraining('Upper B');
    expect(repository.addExercise(upperB, ' SUPÍNO ')).toBe(supino);
    expect(repository.listExercises(upperB)).toEqual([{ id: supino, name: 'Supino' }]);
    expect(() => repository.addExercise(upperB, 'supino')).toThrow(AppError);
});

test('excluir o último treino preserva exercícios, cargas e séries', () => {
    repository.setLoad(supino, 40);
    repository.addSet(supino);
    repository.removeTraining(upperA);
    expect(repository.listTrainings()).toEqual([]);
    expect(repository.getExercise(supino)).toMatchObject({ loadKg: 40, repetitions: [0] });

    const again = repository.createTraining('Upper A');
    expect(repository.addExercise(again, 'Supino')).toBe(supino);
});

test('remover do treino não apaga o exercício, e a ordem é por treino', () => {
    const remada = repository.addExercise(upperA, 'Remada');
    const upperB = repository.createTraining('Upper B');
    repository.addExercise(upperB, 'Remada');
    repository.addExercise(upperB, 'Supino');
    expect(repository.listExercises(upperA).map(item => item.id)).toEqual([supino, remada]);
    expect(repository.listExercises(upperB).map(item => item.id)).toEqual([remada, supino]);
    repository.removeExercise(upperA, supino);
    expect(repository.listExercises(upperA).map(item => item.id)).toEqual([remada]);
    expect(repository.getExercise(supino).name).toBe('Supino');
});

test('nomes de treino não se repetem; renomear mantém os exercícios', () => {
    expect(() => repository.createTraining('Upper A')).toThrow(AppError);
    const other = repository.createTraining('Upper B');
    expect(() => repository.renameTraining(other, 'Upper A')).toThrow(AppError);
    repository.renameTraining(upperA, 'Push');
    repository.renameTraining(upperA, 'Push');
    expect(repository.listTrainings().map(item => item.name)).toEqual(['Push', 'Upper B']);
    expect(repository.listExercises(upperA)).toHaveLength(1);
});

test('excluir treino mantém a sessão e o nome copiado', () => {
    db.run("INSERT INTO session (training_id, training_name, kind, started_at) VALUES (?, 'Upper A', 'workout', 'x')", [upperA]);
    repository.removeTraining(upperA);
    expect(db.get('SELECT training_id, training_name FROM session')).toEqual({ training_id: null, training_name: 'Upper A' });
});

test('só pode haver um treino aberto', () => {
    const insert = () => db.run("INSERT INTO session (kind, started_at) VALUES ('workout', 'x')");
    insert();
    expect(insert).toThrow();
});

test('esquema: reabrir não altera nada e versão mais nova é recusada', () => {
    prepareSchema(db);
    expect(repository.listTrainings()).toHaveLength(1);
    db.exec('PRAGMA user_version = 99');
    expect(() => prepareSchema(db)).toThrow(AppError);
});
