import { useState } from 'react';
import { LayoutChangeEvent, Pressable } from 'react-native';
import { Text, View } from 'native-base';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { HistorySession } from '@database/history';
import { formatDay, formatNumber } from '@utils/format';
import { Metric, metricUnit, metricValue, monthLabel, niceTicks } from '@utils/history';

const FONT = 'Poppins_600SemiBold';
const ACCENT = '#D9F99D';
const SURFACE = '#525252';
const HEIGHT = 170;
const PAD = { left: 40, right: 12, top: 12, bottom: 24 };

interface HistoryChartProps {
    sessions: HistorySession[]; // já filtradas pelo período, do mais antigo ao mais recente
    metric: Metric;
    recordId: number | null;
    start: Date;
    end: Date;
}

export function HistoryChart({ sessions, metric, recordId, start, end }: HistoryChartProps) {
    const [width, setWidth] = useState(0);
    const [selected, setSelected] = useState<number | null>(null); // id da sessão tocada

    const values = sessions.map(session => metricValue(session, metric));
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const low = ticks[0];
    const high = ticks[ticks.length - 1];

    const plotWidth = Math.max(1, width - PAD.left - PAD.right);
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const span = Math.max(1, end.getTime() - start.getTime());

    const x = (iso: string) => PAD.left + ((new Date(iso).getTime() - start.getTime()) / span) * plotWidth;
    const y = (value: number) => PAD.top + (1 - (value - low) / (high - low || 1)) * plotHeight;

    const points = sessions.map((session, index) => ({ session, value: values[index], x: x(session.finishedAt), y: y(values[index]) }));
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');

    // Sem toque, mostra o mais recente.
    const active = points.find(point => point.session.id === selected) ?? points[points.length - 1];

    // Rótulos de mês no início de cada mês dentro do período.
    const months: { x: number; label: string }[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (cursor <= end) {
        months.push({ x: x(cursor.toISOString()), label: monthLabel(cursor) });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    const monthStep = Math.ceil(months.length / 6);

    function handleTouch(locationX: number) {
        const nearest = points.reduce((best, point) => Math.abs(point.x - locationX) < Math.abs(best.x - locationX) ? point : best);
        setSelected(nearest.session.id);
    }

    const unit = metricUnit(metric);
    const description = `${points.length} sessões, de ${formatNumber(values[0])}${unit} a ${formatNumber(values[values.length - 1])}${unit}`;

    return (
        <View>
            {active &&
                <View flexDirection='row' justifyContent='space-between' alignItems='center' mb={1} px={3} py={2} borderRadius={10} bg='#2E2E2E'>
                    <Text color='#E5E5E5' fontSize={12} fontFamily={FONT} allowFontScaling={false}>
                        {formatDay(active.session.finishedAt)} · {active.session.trainingName}
                        {active.session.id === recordId ? ' · recorde' : ''}
                    </Text>
                    <Text color='white' fontSize={14} fontFamily={FONT} allowFontScaling={false}>
                        {metric === 'reps'
                            ? active.session.sets.map(set => set.reps).join('/')
                            : `${formatNumber(active.value)}${unit}`}
                    </Text>
                </View>
            }

            <Pressable
                onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
                onPressIn={event => handleTouch(event.nativeEvent.locationX)}
                onTouchMove={event => handleTouch(event.nativeEvent.locationX)}
                accessibilityRole='image'
                accessibilityLabel={description}
                style={{ height: HEIGHT }}
            >
                {width > 0 &&
                    <Svg width={width} height={HEIGHT}>
                        {ticks.map(tick => (
                            <Line key={`g${tick}`} x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke='#6B6B6B' strokeWidth={1} strokeDasharray='3 4' />
                        ))}
                        {ticks.map(tick => (
                            <SvgText key={`t${tick}`} x={PAD.left - 8} y={y(tick) + 4} fill='#E5E5E5' fontSize={11} fontFamily={FONT} textAnchor='end'>
                                {formatNumber(tick)}
                            </SvgText>
                        ))}
                        {months.filter((_, index) => index % monthStep === 0).map(month => (
                            <SvgText key={`m${month.x}`} x={month.x} y={HEIGHT - 6} fill='#E5E5E5' fontSize={11} fontFamily={FONT} textAnchor='middle'>
                                {month.label}
                            </SvgText>
                        ))}

                        {active && <Line x1={active.x} x2={active.x} y1={PAD.top} y2={PAD.top + plotHeight} stroke='#A3A3A3' strokeWidth={1} />}

                        {points.length > 1 && <Path d={line} fill='none' stroke={ACCENT} strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' />}

                        {points.map(point => {
                            const record = point.session.id === recordId;
                            const isActive = point === active;
                            return (
                                <Circle
                                    key={point.session.id}
                                    cx={point.x}
                                    cy={point.y}
                                    r={record || isActive ? 6 : 4}
                                    fill={record || isActive ? ACCENT : SURFACE}
                                    stroke={record || isActive ? SURFACE : ACCENT}
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </Svg>
                }
            </Pressable>
        </View>
    );
}
