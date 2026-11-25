import AsyncStorage from '@react-native-async-storage/async-storage';

import { backupBuild } from '@storage/backup/backupBuild';
import { exerciseAddSerie } from '@storage/exercise/exerciseAddSerie';
import { exerciseChangeRepetitions } from '@storage/exercise/exerciseChangeRepetitions';
import { exerciseCreate } from '@storage/exercise/exerciseCreate';
import { exerciseEditLoad } from '@storage/exercise/exerciseEditLoad';
import { exerciseGetByName } from '@storage/exercise/exerciseGetByName';
import { exerciseRemoveLastSerie } from '@storage/exercise/exerciseRemoveLastSerie';
import { trainingCreate } from '@storage/training/trainingCreate';
import { trainingEdit } from '@storage/training/trainingEdit';
import { trainingGetByName } from '@storage/training/trainingGetByName';
import { trainingRemoveByName } from '@storage/training/trainingRemoveByName';
import { EXERCISE_COLLECTION, TRAINING_COLLECTION } from '@storage/storageConfig';
import { AppError } from '@utils/AppError';
import { formatLoad, parseLoad } from '@utils/load';

const supino = {
    name: 'Supino',
    load: 20,
    series: [{ name: '1° série', repetitions: 0, exerciseId: 'Supino' }],
};

// AsyncStorage com latência, para as escritas concorrentes se cruzarem como no celular.
for (const method of ['getItem', 'setItem'] as const) {
    const mock = AsyncStorage[method] as jest.Mock;
    const original = mock.getMockImplementation()!;
    mock.mockImplementation(async (...args: unknown[]) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 3));
        return original(...args);
    });
}

beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(EXERCISE_COLLECTION, JSON.stringify([supino]));
    await AsyncStorage.setItem(TRAINING_COLLECTION, JSON.stringify([{ name: 'Upper A', exercicies: ['Supino'] }]));
});

test('20 toques rápidos em + somam 20', async () => {
    await Promise.all(Array.from({ length: 20 }, () => exerciseChangeRepetitions('Supino', 0, 1)));
    expect((await exerciseGetByName('Supino'))?.series[0].repetitions).toBe(20);
});

test('repetições nunca ficam negativas', async () => {
    await Promise.all(Array.from({ length: 3 }, () => exerciseChangeRepetitions('Supino', 0, -1)));
    expect((await exerciseGetByName('Supino'))?.series[0].repetitions).toBe(0);
});

test('excluir o último treino preserva exercícios e cargas', async () => {
    await trainingRemoveByName('Upper A');
    expect(await exerciseGetByName('Supino')).toEqual(supino);
});

test('toques rápidos em + série não repetem nomes, e "−" remove a última', async () => {
    await Promise.all([exerciseAddSerie('Supino'), exerciseAddSerie('Supino')]);
    expect((await exerciseGetByName('Supino'))?.series.map(serie => serie.name))
        .toEqual(['1° série', '2° série', '3° série']);

    await exerciseRemoveLastSerie('Supino');
    await exerciseRemoveLastSerie('Supino');
    expect((await exerciseGetByName('Supino'))?.series).toEqual(supino.series);
});

test('carga decimal é gravada', async () => {
    await exerciseEditLoad('Supino', 12.5);
    expect((await exerciseGetByName('Supino'))?.load).toBe(12.5);
});

test.each(['{quebrado', '{}'])('dados inválidos (%s) não são sobrescritos', async raw => {
    await AsyncStorage.setItem(EXERCISE_COLLECTION, raw);
    await expect(exerciseEditLoad('Supino', 10)).rejects.toThrow();
    await expect(exerciseCreate({ ...supino, name: 'Remada' })).rejects.toThrow();
    expect(await AsyncStorage.getItem(EXERCISE_COLLECTION)).toBe(raw);
});

test('uma falha não trava a fila', async () => {
    await expect(exerciseEditLoad('Inexistente', 1)).rejects.toBeInstanceOf(AppError);
    await exerciseEditLoad('Supino', 30);
    expect((await exerciseGetByName('Supino'))?.load).toBe(30);
});

test('nomes duplicados são recusados com AppError', async () => {
    await expect(exerciseCreate(supino)).rejects.toBeInstanceOf(AppError);
    await expect(trainingCreate({ name: 'Upper A', exercicies: [] })).rejects.toBeInstanceOf(AppError);
});

test('editar o nome do treino mantém os exercícios', async () => {
    await trainingEdit('Upper A', 'Upper B');
    expect(await trainingGetByName('Upper B')).toEqual({ name: 'Upper B', exercicies: ['Supino'] });
    expect(await trainingGetByName('Upper A')).toBeUndefined();
});

test.each<[string, number]>([['12', 12], ['12,5', 12.5], ['12.5', 12.5], [' 7,25 ', 7.25], ['0', 0], ['12,', 12]])(
    'parseLoad aceita "%s"', (text, expected) => expect(parseLoad(text)).toBe(expected)
);

test.each(['', 'abc', '12kg', '-5', '1,2,3', '1.000,5', ','])(
    'parseLoad recusa "%s"', text => expect(parseLoad(text)).toBeNull()
);

test('formatLoad usa vírgula', () => expect(formatLoad(12.5)).toBe('12,5'));

test('backup preserva o texto bruto de cada chave', () => {
    const backup = backupBuild([['a', '{quebrado'], ['b', null]], new Date(0));
    expect(backup.asyncStorage).toEqual({ a: '{quebrado', b: null });
});
