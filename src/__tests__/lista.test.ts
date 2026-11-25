import { prepareImport } from '@database/backup';
import { normalizeName } from '@database/normalizeName';
import { createRepository } from '@database/repository';

import { createMemoryDatabase } from '../testUtils/memoryDatabase';

const lista = require('../../scripts/lista');

const text = `
# Upper A
Supino reto | 22,5 | 10 8 7
Elevação lateral | 8 | -

# Upper B
Remada | 40.0 | 12
Supino reto
`;

test('lista vira backup e migra com ordem, cargas e séries', () => {
    const list = lista.parseList(text);
    expect(list.errors).toEqual([]);

    const db = createMemoryDatabase();
    prepareImport(JSON.stringify(lista.buildBackup(list))).apply(db);
    const repository = createRepository(db);

    expect(repository.listTrainings().map(training => [
        training.name,
        repository.listExercises(training.id).map(item => {
            const { name, loadKg, repetitions } = repository.getExercise(item.id);
            return [name, loadKg, repetitions];
        }),
    ])).toEqual([
        ['Upper A', [['Supino reto', 22.5, [10, 8, 7]], ['Elevação lateral', 8, []]]],
        ['Upper B', [['Remada', 40, [12]], ['Supino reto', 22.5, [10, 8, 7]]]],
    ]);
    expect(lista.report(list)).toContain('Total: 2 treinos, 3 exercícios, 4 séries, 4 vínculos, 0 duplicatas.');
});

test.each([
    ['', 'Nenhum treino'],
    ['Supino | 1 | 2', 'antes do primeiro treino'],
    ['# A\nSupino', 'não tem carga'],
    ['# A\nSupino | dez | 2', 'não entendi'],
    ['# A\nSupino | 1 | 2 x', 'não entendi'],
    ['# A\nSupino | 1', 'não entendi'],
    ['# A\nSupino | 1 | 2\nSupino', 'repetido em'],
    ['# A\nSupino | 1 | 2\n# A\nSupino', 'treino repetido'],
    ['# A\nSupino | 1 | 2\n# B\nSupino | 1 | 3', 'valores diferentes'],
])('lista inválida %j', (input, message) => {
    expect(lista.parseList(input).errors.join('\n')).toContain(message);
});

test('duplicatas são avisadas com os dados de cada uma', () => {
    const list = lista.parseList('# A\nMáquina | 1 | 2\n# B\nmaquina | 3 | 4');
    expect(list.errors).toEqual([]);
    expect(list.duplicates).toEqual([['Máquina', 'maquina']]);
    expect(lista.report(list)).toContain('maquina: 3 kg · 4 (B)');
});

test.each(['  Rosca  Scott na MÁQUINA ', 'Tríceps', 'ção'])('normalização igual à do app: %s', name => {
    expect(lista.normalizeName(name)).toBe(normalizeName(name));
});

test('normalizeName', () => expect(normalizeName('  Rosca  Scott na MÁQUINA ')).toBe('rosca scott na maquina'));
