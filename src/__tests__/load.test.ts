import { backupBuild } from '@storage/backup/backupBuild';
import { formatLoad, parseLoad } from '@utils/load';

test.each<[string, number]>([['12', 12], ['12,5', 12.5], ['12.5', 12.5], [' 7,25 ', 7.25], ['0', 0], ['12,', 12]])(
    'parseLoad aceita "%s"', (text, expected) => expect(parseLoad(text)).toBe(expected)
);

test.each(['', 'abc', '12kg', '-5', '1,2,3', '1.000,5', ','])(
    'parseLoad recusa "%s"', text => expect(parseLoad(text)).toBeNull()
);

test('formatLoad usa vírgula', () => expect(formatLoad(12.5)).toBe('12,5'));

test('backup das chaves antigas preserva o texto bruto', () => {
    const backup = backupBuild([['a', '{quebrado'], ['b', null]], new Date(0));
    expect(backup.asyncStorage).toEqual({ a: '{quebrado', b: null });
});
