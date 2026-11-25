import React, { useState } from 'react';
import { View, Text, Image, ScrollView } from 'native-base';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import BackgroundImage from '@assets/padrões.png';

import { ActionButton } from '@components/ActionButton';
import { Header } from '@components/Header';

import { useDatabase } from '@database/DatabaseProvider';

import { SummaryScreenProps } from '@routes/routeTypes';
import { formatDay, formatDelta, formatDuration, formatNumber } from '@utils/format';
import { formatLoad } from '@utils/load';

const FONT = 'Poppins_600SemiBold';

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
    return (
        <View w='48%' minH='84px' mb={3} px={3} py={2} borderRadius={14} bg='#525252' justifyContent='center'>
            <Text color='#E5E5E5' fontSize={11} fontFamily={FONT} allowFontScaling={false}>{label}</Text>
            <Text color='white' fontSize={22} numberOfLines={1} adjustsFontSizeToFit fontFamily={FONT} allowFontScaling={false}>{value}</Text>
            {note && <Text color='#D9F99D' fontSize={12} numberOfLines={1} fontFamily={FONT} allowFontScaling={false}>{note}</Text>}
        </View>
    );
}

export function Summary({ navigation, route }: SummaryScreenProps) {
    const insets = useSafeAreaInsets();
    const { repository: { workouts } } = useDatabase();

    const [summary] = useState(() => workouts.getSummary(route.params.sessionId));
    const { totals, previous, records, comparison } = summary;

    const minutes = (ms: number) => Math.floor(ms / 60000);
    const versus = (delta: number, unit = '') => `${formatDelta(delta, unit)} vs. anterior`;

    return (
        <View bg='#404040' flex={1}>
            <Image source={BackgroundImage} alt='Background' position='absolute' top={0} left={0} right={0} bottom={0} />

            <Header title='CONCLUÍDO' subtitle={`${summary.trainingName} · ${formatDay(summary.startedAt)}`} />

            <ScrollView flex={1} px={6} showsVerticalScrollIndicator={false}>
                <View flexDirection='row' flexWrap='wrap' justifyContent='space-between'>
                    <Stat
                        label='DURAÇÃO'
                        value={formatDuration(totals.durationMs)}
                        note={previous ? versus(minutes(totals.durationMs) - minutes(previous.durationMs), ' min') : undefined}
                    />
                    <Stat
                        label='SÉRIES'
                        value={String(totals.sets)}
                        note={`${totals.exercises} ${totals.exercises === 1 ? 'exercício' : 'exercícios'}`}
                    />
                    <Stat
                        label='VOLUME'
                        value={`${formatNumber(totals.volumeKg)} kg`}
                        note={previous && previous.volumeKg > 0
                            ? versus(Math.round((totals.volumeKg / previous.volumeKg - 1) * 100), '%')
                            : undefined}
                    />
                    <Stat
                        label='REPETIÇÕES'
                        value={String(totals.reps)}
                        note={previous ? versus(totals.reps - previous.reps) : undefined}
                    />
                </View>

                {records.length > 0 &&
                    <Text mt={3} mb={2} color='white' fontSize={13} fontFamily={FONT} allowFontScaling={false}>RECORDES DO DIA</Text>
                }
                {records.map(record => (
                    <View
                        key={record.name}
                        flexDirection='row'
                        alignItems='center'
                        mb={2}
                        px={3}
                        py={2}
                        borderRadius={14}
                        borderWidth={2}
                        borderColor='#D9F99D'
                        bg='#525252'
                    >
                        <MaterialIcons name='emoji-events' size={26} color='#D9F99D' />
                        <View flex={1} ml={3}>
                            <Text color='white' fontSize={16} numberOfLines={1} fontFamily={FONT} allowFontScaling={false}>{record.name}</Text>
                            <Text color='#E5E5E5' fontSize={13} fontFamily={FONT} allowFontScaling={false}>
                                {record.loadKg > 0 ? `${formatLoad(record.loadKg)} kg × ${record.reps}` : `${record.reps} repetições`}
                            </Text>
                        </View>
                    </View>
                ))}

                {comparison.length > 0 &&
                    <View mt={3} px={3} py={3} borderRadius={14} bg='#262626'>
                        <Text mb={1} color='white' fontSize={13} numberOfLines={1} fontFamily={FONT} allowFontScaling={false}>
                            {`VS. ÚLTIMO ${summary.trainingName.toUpperCase()}`}
                        </Text>
                        {comparison.map(({ name, loadDelta, repsDelta }) => {
                            // Com carga diferente, comparar repetições enganaria.
                            const delta = loadDelta !== 0 ? loadDelta : repsDelta;
                            return (
                                <View key={name} flexDirection='row' justifyContent='space-between' py={1}>
                                    <Text flex={1} mr={3} color='white' fontSize={14} numberOfLines={1} fontFamily={FONT} allowFontScaling={false}>
                                        {name}
                                    </Text>
                                    <Text
                                        color={delta > 0 ? '#D9F99D' : delta < 0 ? '#FDBA74' : '#E5E5E5'}
                                        fontSize={14}
                                        fontFamily={FONT}
                                        allowFontScaling={false}
                                    >
                                        {formatDelta(delta, loadDelta !== 0 ? ' kg' : Math.abs(delta) === 1 ? ' rep' : ' reps')}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                }
            </ScrollView>

            <View px={6} pt={4} style={{ paddingBottom: insets.bottom + 24 }}>
                <ActionButton title='CONCLUIR' onPress={() => navigation.popToTop()} />
            </View>
        </View>
    );
}
