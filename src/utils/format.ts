import { LastMark } from '@database/workouts';

import { formatLoad } from './load';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const pad = (value: number) => String(value).padStart(2, '0');

export function formatDay(iso: string): string {
    const date = new Date(iso);
    return `${WEEKDAYS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

export function formatDuration(ms: number): string {
    const minutes = Math.max(0, Math.floor(ms / 60000));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${pad(minutes % 60)}`;
}

// Duas casas no máximo, vírgula decimal e ponto de milhar.
export function formatNumber(value: number): string {
    const [whole, decimal] = String(Math.round(value * 100) / 100).split('.');
    return whole.replace(/\B(?=(\d{3})+$)/g, '.') + (decimal ? `,${decimal}` : '');
}

export function formatLast(last: LastMark | null): string | undefined {
    if (!last) {
        return undefined;
    }

    const reps = last.sets.map(set => set.reps).join('/');
    return last.loadKg > 0 ? `Última: ${formatLoad(last.loadKg)} kg · ${reps}` : `Última: ${reps}`;
}

export function formatDelta(delta: number, unit = ''): string {
    if (delta === 0) {
        return '= igual';
    }

    return `${delta > 0 ? '↑ +' : '↓ −'}${formatNumber(Math.abs(delta))}${unit}`;
}

// Aceita "8-12", "8 a 12" e "10". Vazio remove a faixa; texto inválido retorna undefined.
export function parseTarget(text: string): { min: number; max: number } | null | undefined {
    if (text.trim() === '') {
        return null;
    }

    const match = /^(\d{1,3})(?:\s*(?:-|–|a|\/)\s*(\d{1,3}))?$/i.exec(text.trim());
    if (!match) {
        return undefined;
    }

    const min = Number(match[1]);
    const max = Number(match[2] ?? match[1]);
    return min > 0 && max >= min ? { min, max } : undefined;
}

export function formatTarget(min: number | null, max: number | null): string | undefined {
    if (min === null || max === null) {
        return undefined;
    }

    return min === max ? String(min) : `${min}–${max}`;
}
