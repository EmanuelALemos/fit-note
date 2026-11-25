import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Text, View } from 'native-base';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BackgroundImage from '@assets/padrões.png';

import { Header } from '@components/Header';
import { HistoryChart } from '@components/HistoryChart';

import { useDatabase } from '@database/DatabaseProvider';
import { readHistory } from '@database/history';

import { HistoryScreenProps } from '@routes/routeTypes';
import { formatDay, formatDelta, formatLast, formatNumber } from '@utils/format';
import { inPeriod, Metric, METRICS, metricUnit, metricValue, Period, PERIODS, periodStart, recordId } from '@utils/history';
import { formatLoad } from '@utils/load';

const FONT = 'Poppins_600SemiBold';

function Choice({ label, active, onPress, small = false }: { label: string; active: boolean; onPress: () => void; small?: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole='button'
            accessibilityState={{ selected: active }}
            hitSlop={small ? 6 : 0}
            style={{
                flex: small ? undefined : 1,
                height: small ? 30 : 40,
                paddingHorizontal: small ? 9 : 0,
                borderRadius: small ? 7 : 9,
                backgroundColor: active ? '#D9F99D' : small ? '#404040' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text color={active ? '#1A1A1A' : 'white'} fontSize={small ? 12 : 14} fontFamily={FONT} allowFontScaling={false}>{label}</Text>
        </TouchableOpacity>
    );
}

export function History({ navigation, route }: HistoryScreenProps) {
    const { exerciseId, exerciseName } = route.params;

    const insets = useSafeAreaInsets();
    const { db } = useDatabase();

    const [history] = useState(() => readHistory(db, exerciseId));
    const [metric, setMetric] = useState<Metric>('load');
    const [period, setPeriod] = useState<Period>('3M');

    const now = useMemo(() => new Date(), []);
    const { sessions, imported } = history;
    const visible = inPeriod(sessions, period, now);
    const record = recordId(sessions, metric);
    const loadRecord = recordId(sessions, 'load');
    const unit = metricUnit(metric);

    const latest = visible[visible.length - 1];
    const change = visible.length > 1 ? metricValue(latest, metric) - metricValue(visible[0], metric) : null;
    const periodName = { '1M': 'em 1 mês', '3M': 'em 3 meses', '6M': 'em 6 meses', '1A': 'em 1 ano' }[period];

    const total = sessions.length;
    const subtitle = total === 0 ? 'Histórico' : `Histórico · ${total} ${total === 1 ? 'sessão' : 'sessões'}`;

    return (
        <View bg='#404040' flex={1}>
            <Image source={BackgroundImage} alt='Background' position='absolute' top={0} left={0} right={0} bottom={0} />

            <Header title={exerciseName.toUpperCase()} status={subtitle} onBackPress={() => navigation.goBack()} />

            <ScrollView flex={1} px={6} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
                {total === 0 ?
                    <View mt={6} p={4} borderRadius={14} bg='#525252'>
                        <Text color='white' fontSize={16} fontFamily={FONT} allowFontScaling={false}>Nenhum treino registrado ainda.</Text>
                        <Text mt={1} color='#E5E5E5' fontSize={13} fontFamily={FONT} allowFontScaling={false}>
                            O gráfico começa no primeiro treino finalizado com este exercício.
                        </Text>
                        {imported &&
                            <Text mt={3} color='#D9F99D' fontSize={13} fontFamily={FONT} allowFontScaling={false}>
                                {`${formatLast(imported)!.replace('Última', 'Marca importada')}`}
                            </Text>
                        }
                    </View>
                    :
                    <>
                        <View flexDirection='row' p={1} borderRadius={12} bg='#2E2E2E' style={{ gap: 6 }}>
                            {METRICS.map(item => (
                                <Choice key={item.key} label={item.label} active={metric === item.key} onPress={() => setMetric(item.key)} />
                            ))}
                        </View>

                        <View mt={3} p={4} borderRadius={14} bg='#525252'>
                            <View flexDirection='row' justifyContent='space-between' alignItems='flex-start'>
                                <View flex={1} mr={2}>
                                    <Text color='white' fontSize={28} lineHeight={36} fontFamily={FONT} allowFontScaling={false}>
                                        {latest ? `${formatNumber(metricValue(latest, metric))}${unit}` : '–'}
                                    </Text>
                                    <Text
                                        color={change === null || change === 0 ? '#E5E5E5' : change > 0 ? '#D9F99D' : '#FDBA74'}
                                        fontSize={13}
                                        fontFamily={FONT}
                                        allowFontScaling={false}
                                    >
                                        {latest
                                            ? change === null ? `1 sessão ${periodName}` : `${formatDelta(change, unit)} ${periodName}`
                                            : `Nenhuma sessão ${periodName}`}
                                    </Text>
                                </View>
                                <View flexDirection='row' style={{ gap: 4 }}>
                                    {PERIODS.map(item => (
                                        <Choice key={item.key} small label={item.key} active={period === item.key} onPress={() => setPeriod(item.key)} />
                                    ))}
                                </View>
                            </View>

                            {visible.length > 0 &&
                                <View mt={3}>
                                    <HistoryChart
                                        key={`${metric}-${period}`}
                                        sessions={visible}
                                        metric={metric}
                                        recordId={record}
                                        start={periodStart(period, now)}
                                        end={now}
                                    />
                                </View>
                            }
                        </View>

                        <Text mt={5} mb={2} color='white' fontSize={13} fontFamily={FONT} allowFontScaling={false}>SESSÕES</Text>
                        {[...sessions].reverse().map(session => {
                            const top = metricValue(session, 'load');
                            return (
                                <View
                                    key={session.id}
                                    flexDirection='row'
                                    justifyContent='space-between'
                                    alignItems='center'
                                    mb={2}
                                    px={3}
                                    py={2}
                                    borderRadius={12}
                                    bg='#525252'
                                >
                                    <View flex={1} mr={2}>
                                        <Text color='white' fontSize={14} fontFamily={FONT} allowFontScaling={false}>{formatDay(session.finishedAt)}</Text>
                                        <Text color='#E5E5E5' fontSize={12} numberOfLines={1} fontFamily={FONT} allowFontScaling={false}>{session.trainingName}</Text>
                                    </View>
                                    <View alignItems='flex-end'>
                                        <Text color='white' fontSize={15} fontFamily={FONT} allowFontScaling={false}>{`${formatLoad(top)} kg`}</Text>
                                        <Text color='#D9F99D' fontSize={12} fontFamily={FONT} allowFontScaling={false}>
                                            {session.sets.map(set => set.reps).join(' / ')}
                                            {session.id === loadRecord ? ' · recorde' : ''}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        {imported &&
                            <Text mt={1} color='#E5E5E5' fontSize={12} fontFamily={FONT} allowFontScaling={false}>
                                {`${formatLast(imported)!.replace('Última', 'Marca importada do app antigo')}. Fica fora do gráfico.`}
                            </Text>
                        }
                    </>
                }
            </ScrollView>
        </View>
    );
}
