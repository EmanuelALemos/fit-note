import { buildBackup, prepareImport } from '@database/backup';
import { Database } from '@database/Database';
import { createRepository, Repository } from '@database/repository';
import { prepareSchema } from '@database/schema';
import { AppError } from '@utils/AppError';
import { formatDelta, formatDuration, formatLast, formatNumber, formatTarget, parseTarget } from '@utils/format';

import { createMemoryDatabase } from '../testUtils/memoryDatabase';

let db: Database;
let repository: Repository;
let workouts: Repository['workouts'];
let time: number;
let upperA: number;
let upperB: number;
let supino: number;

const minutes = (value: number) => { time += value * 60000; };
const at = () => new Date(time).toISOString();
const plan = (id = supino) => workouts.getExercise(id).sets;
const view = (id = supino) => workouts.getExercise(id).sets.map(set => [set.loadKg, set.reps, set.done]);

// Um treino inteiro: repetições por série, com a carga atual.
function train(trainingId: number, exerciseId: number, reps: number[]) {
    const session = workouts.start(trainingId);
    reps.forEach((_, index) => {
        minutes(3);
        workouts.setDone(trainingId, exerciseId, index + 1, true, reps.map(item => ({
            reps: item, loadKg: workouts.getExercise(exerciseId).loadKg, done: false,
        })));
    });
    workouts.finish(session);
    minutes(60 * 24);
    return session;
}

beforeEach(() => {
    time = new Date('2026-11-20T10:00:00').getTime();
    db = createMemoryDatabase();
    repository = createRepository(db, () => new Date(time));
    workouts = repository.workouts;
    upperA = repository.createTraining('Upper A');
    upperB = repository.createTraining('Upper B');
    supino = repository.addExercise(upperA, 'Supino');
    repository.addExercise(upperB, 'Supino');
    workouts.setLoad(supino, 20);
});

test('consultar e planejar sem treino não cria sessão', () => {
    workouts.setDefaultSets(supino, 3);
    expect(view()).toEqual([[20, 0, false], [20, 0, false], [20, 0, false]]);
    expect(db.all('SELECT * FROM session')).toEqual([]);
    expect(() => workouts.changeRepetitions(supino, 1, 1, plan())).toThrow(AppError);
});

test('o primeiro ✓ inicia o treino; desmarcar não o encerra', () => {
    workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 10, done: false }, { loadKg: 20, reps: 8, done: false }]);
    expect(workouts.getOpen()).toMatchObject({ trainingId: upperA, trainingName: 'Upper A', completedSets: 1, startedAt: at() });
    expect(view()).toEqual([[20, 10, true], [20, 8, false]]);
    workouts.setDone(upperA, supino, 1, false, plan());
    expect(workouts.getOpen()).toMatchObject({ completedSets: 0 });
});

test('série com zero repetições não pode ser concluída e não deixa treino aberto', () => {
    expect(() => workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 0, done: false }])).toThrow(AppError);
    expect(() => workouts.setDone(upperA, supino, 2, true, [{ loadKg: 20, reps: 5, done: false }])).toThrow(AppError);
    expect(workouts.getOpen()).toBeNull();
});

test('20 toques em + somam 20, mesmo com a sugestão antiga da tela; nunca fica negativo', () => {
    workouts.setDefaultSets(supino, 1);
    workouts.start(upperA);
    const stale = plan();
    for (let i = 0; i < 20; i++) workouts.changeRepetitions(supino, 1, 1, stale);
    expect(view()).toEqual([[20, 20, false]]);
    for (let i = 0; i < 25; i++) workouts.changeRepetitions(supino, 1, -1, stale);
    expect(view()).toEqual([[20, 0, false]]);
});

test('toque duplo no ✓ com o mesmo alvo não desfaz, e mantém o horário do primeiro', () => {
    const suggestion = [{ loadKg: 20, reps: 10, done: false }];
    workouts.setDone(upperA, supino, 1, true, suggestion);
    const first = at();
    minutes(1);
    workouts.setDone(upperA, supino, 1, true, suggestion);
    expect(db.all('SELECT completed_at FROM set_log')).toEqual([{ completed_at: first }]);
});

test('série concluída não volta a zero', () => {
    workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 1, done: false }]);
    workouts.changeRepetitions(supino, 1, -1, plan());
    expect(view()).toEqual([[20, 1, true]]);
});

test('finalizar guarda só as séries com ✓ e sugere a última vez em qualquer treino', () => {
    workouts.setDefaultSets(supino, 3);
    workouts.setDone(upperA, supino, 1, true, [10, 8, 7].map(reps => ({ loadKg: 20, reps, done: false })));
    workouts.setDone(upperA, supino, 2, true, plan());
    minutes(30);
    expect(workouts.finish(workouts.getOpen()!.id)).toBe(true);
    expect(workouts.getOpen()).toBeNull();
    expect(workouts.getLast(supino)).toEqual({ loadKg: 20, sets: [{ loadKg: 20, reps: 10 }, { loadKg: 20, reps: 8 }] });

    workouts.start(upperB);
    expect(workouts.getExercise(supino)).toMatchObject({ saved: false });
    // 3 planejadas, mesmo com 2 concluídas; a 3ª repete a última repetição conhecida
    expect(view()).toEqual([[20, 10, false], [20, 8, false], [20, 8, false]]);
});

test('finalizar sem nenhum ✓ não guarda nada', () => {
    const session = workouts.start(upperA);
    workouts.addSet(supino, []);
    expect(workouts.finish(session)).toBe(false);
    expect(db.all('SELECT * FROM session')).toEqual([]);
    expect(db.all('SELECT * FROM set_log')).toEqual([]);
});

test('descartar apaga só o treino aberto', () => {
    const old = train(upperA, supino, [10]);
    workouts.setDone(upperA, supino, 1, true, plan());
    workouts.discard(workouts.getOpen()!.id);
    expect(workouts.getOpen()).toBeNull();
    expect(() => workouts.discard(old)).toThrow(AppError);
    expect(() => workouts.finish(old)).toThrow(AppError);
    expect(workouts.getLast(supino)!.sets).toHaveLength(1);
});

test('3 horas sem ✓ encerram no horário da última série', () => {
    workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 10, done: false }, { loadKg: 20, reps: 9, done: false }]);
    minutes(40);
    workouts.setDone(upperA, supino, 2, true, plan());
    const lastSet = at();
    minutes(179);
    expect(workouts.getOpen()).not.toBeNull();
    minutes(1);
    expect(workouts.getOpen()).toBeNull();
    expect(db.all('SELECT finished_at FROM session')).toEqual([{ finished_at: lastSet }]);
});

test('editar sem ✓ não adia o encerramento, e a edição tardia é recusada', () => {
    workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 10, done: false }]);
    minutes(170);
    workouts.changeRepetitions(supino, 1, 1, plan());
    minutes(10);
    expect(() => workouts.changeRepetitions(supino, 1, 1, plan())).toThrow(AppError);
    expect(workouts.getOpen()).toBeNull();
});

test('iniciado e esquecido sem nenhum ✓ é descartado depois de 3 horas', () => {
    workouts.start(upperA);
    minutes(180);
    expect(workouts.getOpen()).toBeNull();
    expect(db.all('SELECT * FROM session')).toEqual([]);
});

test('✓ no dia seguinte encerra o treino esquecido e inicia outro', () => {
    workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 10, done: false }]);
    minutes(60 * 24);
    workouts.setDone(upperB, supino, 1, true, [{ loadKg: 20, reps: 11, done: false }]);
    expect(db.all('SELECT training_name, finished_at IS NULL AS open FROM session ORDER BY id')).toEqual([
        { training_name: 'Upper A', open: 0 }, { training_name: 'Upper B', open: 1 },
    ]);
});

test('só um treino por vez; ✓ em outro treino entra no que está aberto', () => {
    workouts.start(upperA);
    expect(() => workouts.start(upperB)).toThrow('Upper A está em andamento');
    workouts.setDone(upperB, supino, 1, true, [{ loadKg: 20, reps: 10, done: false }]);
    expect(workouts.getOpen()).toMatchObject({ trainingId: upperA, completedSets: 1 });
});

test('treino aberto sobrevive a reabrir o app', () => {
    workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 10, done: false }]);
    const again = createRepository(db, () => new Date(time));
    expect(again.workouts.getOpen()).toMatchObject({ completedSets: 1 });
    expect(again.workouts.getExercise(supino)).toMatchObject({ saved: true });
});

test('treino em andamento não pode ser excluído; depois, o histórico fica', () => {
    const session = workouts.start(upperA);
    expect(() => repository.removeTraining(upperA)).toThrow(AppError);
    workouts.discard(session);
    train(upperA, supino, [10]);
    repository.removeTraining(upperA);
    expect(workouts.getLast(supino)!.sets).toHaveLength(1);
});

test('carga do exercício não altera série concluída nem série com carga própria', () => {
    workouts.setDone(upperA, supino, 1, true, [10, 9, 8].map(reps => ({ loadKg: 20, reps, done: false })));
    workouts.setSetLoad(supino, 3, 15, plan());
    workouts.setLoad(supino, 22.5);
    expect(view()).toEqual([[20, 10, true], [22.5, 9, false], [15, 8, false]]);
    expect(workouts.getExercise(supino).loadKg).toBe(22.5);
});

test('séries entram e saem pelo fim', () => {
    workouts.setDefaultSets(supino, 1);
    workouts.start(upperA);
    workouts.changeRepetitions(supino, 1, 6, plan());
    workouts.addSet(supino, plan());
    expect(view()).toEqual([[20, 6, false], [20, 6, false]]);
    workouts.removeLastSet(supino, plan());
    expect(view()).toEqual([[20, 6, false]]);
});

test('a importada vale só enquanto não houver treino; séries planejadas viram a próxima sugestão', () => {
    const imported = db.run("INSERT INTO session (kind, started_at, finished_at) VALUES ('imported', '2027-01-01', '2027-01-01')");
    db.run('INSERT INTO set_log (session_id, exercise_id, set_number, load_kg, reps) VALUES (?, ?, 1, 30, 5)', [imported, supino]);
    expect(workouts.getLast(supino)).toMatchObject({ loadKg: 30 });
    train(upperA, supino, [10, 9]);
    expect(workouts.getLast(supino)!.sets.map(set => set.reps)).toEqual([10, 9]);
    expect(repository.listTrainings()[0].lastWorkoutAt).not.toBeNull();
    expect(repository.listTrainings()[1].lastWorkoutAt).toBeNull();
    workouts.setDefaultSets(supino, 3);
    expect(view().map(set => set[1])).toEqual([10, 9, 9]);
});

test('resumo: totais, recorde e comparação com o treino anterior do mesmo nome', () => {
    const first = train(upperA, supino, [10, 8]);
    expect(workouts.getSummary(first)).toMatchObject({ previous: null, records: [], comparison: [] });
    train(upperB, supino, [12, 12]);
    const same = train(upperA, supino, [11, 8]);
    const summary = workouts.getSummary(same);
    expect(summary.totals).toEqual({ durationMs: 6 * 60000, exercises: 1, sets: 2, volumeKg: 380, reps: 19 });
    expect(summary.previous).toMatchObject({ reps: 18 });
    expect(summary.records).toEqual([]); // 12 no Upper B é melhor
    expect(summary.comparison).toEqual([{ name: 'Supino', loadDelta: 0, repsDelta: 1 }]);

    workouts.setLoad(supino, 22.5);
    const heavier = workouts.getSummary(train(upperA, supino, [6]));
    expect(heavier.records).toEqual([{ name: 'Supino', loadKg: 22.5, reps: 6 }]);
    expect(heavier.comparison[0].loadDelta).toBe(2.5);
});

test('versão 1 vira 2 fechando as importadas, e o backup da versão 1 também', () => {
    const build = (target: Database) => {
        target.run("INSERT INTO exercise (name, name_normalized, created_at) VALUES ('X', 'x', 'T')");
        const id = target.get<{ id: number }>("SELECT id FROM exercise WHERE name = 'X'")!.id;
        const session = target.run("INSERT INTO session (kind, started_at) VALUES ('imported', '2026-01-01')");
        target.run("INSERT INTO set_log (session_id, exercise_id, set_number, load_kg, reps, completed_at) VALUES (?, ?, 1, 5, 9, '2026-02-01')", [session, id]);
        return id;
    };

    const id = build(db);
    const backup = { ...buildBackup(db), schemaVersion: 1 };
    db.exec('PRAGMA user_version = 1');
    prepareSchema(db);
    expect(db.get('PRAGMA user_version')).toEqual({ user_version: 2 });
    expect(workouts.getLast(id)).toEqual({ loadKg: 5, sets: [{ loadKg: 5, reps: 9 }] });
    expect(db.all('SELECT finished_at FROM session')).toEqual([{ finished_at: '2026-02-01' }]);

    const other = createMemoryDatabase();
    prepareImport(JSON.stringify(backup)).apply(other);
    expect(other.all('SELECT * FROM session')).toEqual(db.all('SELECT * FROM session'));
});

test('treino aberto entra no backup e volta aberto', () => {
    workouts.setDone(upperA, supino, 1, true, [{ loadKg: 20, reps: 10, done: false }]);
    const other = createMemoryDatabase();
    prepareImport(JSON.stringify(buildBackup(db))).apply(other);
    expect(createRepository(other, () => new Date(time)).workouts.getOpen()).toMatchObject({ completedSets: 1 });
});

test('faixa alvo', () => {
    workouts.setTarget(supino, { min: 8, max: 12 });
    workouts.setDefaultSets(supino, 1);
    expect(workouts.getExercise(supino)).toMatchObject({ targetMin: 8, targetMax: 12, sets: [{ reps: 8 }] });
    workouts.setTarget(supino, null);
    expect(workouts.getExercise(supino).targetMax).toBeNull();

    expect(parseTarget('8-12')).toEqual({ min: 8, max: 12 });
    expect(parseTarget(' 8 a 12 ')).toEqual({ min: 8, max: 12 });
    expect(parseTarget('8–12')).toEqual({ min: 8, max: 12 });
    expect(parseTarget('10')).toEqual({ min: 10, max: 10 });
    expect(parseTarget('')).toBeNull();
    for (const text of ['12-8', '0', 'abc', '8-', '8.5']) expect(parseTarget(text)).toBeUndefined();
    expect(formatTarget(8, 12)).toBe('8–12');
});

test('formatos', () => {
    expect(formatLast({ loadKg: 22.5, sets: [{ loadKg: 22.5, reps: 10 }, { loadKg: 22.5, reps: 8 }] })).toBe('Última: 22,5 kg · 10/8');
    expect(formatLast({ loadKg: 0, sets: [{ loadKg: 0, reps: 11 }] })).toBe('Última: 11');
    expect(formatNumber(4820.5)).toBe('4.820,5');
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatDuration(52 * 60000)).toBe('52 min');
    expect(formatDuration(65 * 60000)).toBe('1 h 05');
    expect([formatDelta(1), formatDelta(0), formatDelta(-2.5, ' kg')]).toEqual(['↑ +1', '= igual', '↓ −2,5 kg']);
});

test('séries planejadas só mudam com + e −, também durante o treino', () => {
    workouts.setTarget(supino, { min: 8, max: 12 });
    workouts.setDefaultSets(supino, 4);
    workouts.start(upperA);
    workouts.removeLastSet(supino, plan());
    expect(db.get('SELECT default_sets AS n FROM exercise WHERE id = ?', [supino])).toEqual({ n: 3 });
    workouts.setDone(upperA, supino, 1, true, plan());
    workouts.finish(workouts.getOpen()!.id);
    expect(view()).toHaveLength(3);
    workouts.start(upperA);
    workouts.addSet(supino, plan());
    expect(db.get('SELECT default_sets AS n FROM exercise WHERE id = ?', [supino])).toEqual({ n: 4 });
});
