import { HistorySession } from '@database/history';

export type Metric = 'load' | 'reps' | 'volume';
export type Period = '1M' | '3M' | '6M' | '1A';

export const METRICS: { key: Metric; label: string }[] = [
    { key: 'load', label: 'Carga' },
    { key: 'reps', label: 'Repetições' },
    { key: 'volume', label: 'Volume' },
];

export const PERIODS: { key: Period; months: number }[] = [
    { key: '1M', months: 1 },
    { key: '3M', months: 3 },
    { key: '6M', months: 6 },
    { key: '1A', months: 12 },
];

// Carga = maior carga do dia; Repetições = total; Volume = soma de carga × repetições.
export function metricValue(session: HistorySession, metric: Metric): number {
    switch (metric) {
        case 'load': return Math.max(...session.sets.map(set => set.loadKg));
        case 'reps': return session.sets.reduce((total, set) => total + set.reps, 0);
        case 'volume': return session.sets.reduce((total, set) => total + set.loadKg * set.reps, 0);
    }
}

export function metricUnit(metric: Metric): string {
    return metric === 'reps' ? '' : ' kg';
}

export function periodStart(period: Period, now: Date): Date {
    const months = PERIODS.find(item => item.key === period)!.months;
    const start = new Date(now);
    start.setMonth(start.getMonth() - months);
    return start;
}

export function inPeriod(sessions: HistorySession[], period: Period, now: Date): HistorySession[] {
    const start = periodStart(period, now).getTime();
    return sessions.filter(session => new Date(session.finishedAt).getTime() >= start);
}

// Melhor de todos os tempos na métrica; em empate, o mais antigo (quem bateu primeiro).
export function recordId(sessions: HistorySession[], metric: Metric): number | null {
    let best: HistorySession | null = null;

    for (const session of sessions) {
        if (!best || metricValue(session, metric) > metricValue(best, metric)) {
            best = session;
        }
    }

    return best?.id ?? null;
}

// Poucas marcas "redondas" no eixo, cobrindo de min a max.
export function niceTicks(min: number, max: number, count = 3): number[] {
    if (min === max) {
        const pad = Math.max(1, Math.abs(min) * 0.1);
        min -= pad;
        max += pad;
    }

    const rough = (max - min) / count;
    const power = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map(factor => factor * power).find(value => value >= rough)!;
    const first = Math.floor(min / step) * step;
    const ticks: number[] = [];

    // Sempre até o valor máximo, para nenhum ponto ficar fora do gráfico.
    for (let value = first; ticks.length < 8; value += step) {
        ticks.push(Math.round(value * 1000) / 1000);
        if (value >= max - step * 1e-9) {
            break;
        }
    }

    return ticks;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function monthLabel(date: Date): string {
    return MONTHS[date.getMonth()];
}
