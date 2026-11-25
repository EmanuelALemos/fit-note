import React from 'react';
import { View, Text } from 'native-base';
import { TouchableOpacity } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

import { SetMark } from '@database/workouts';
import { formatDelta } from '@utils/format';
import { formatLoad } from '@utils/load';

interface SerieBodyCardProps {
    number: number;
    last?: SetMark;
    lastLoad?: number; // carga principal da última vez
    repetitions: number;
    done: boolean;
    ownLoad?: number; // só quando difere da carga do exercício
    onPressNumber: () => void;
    onAddRepetition: () => void;
    onRemoveRepetition: () => void;
    onToggleDone: () => void;
}

const FONT = 'Poppins_600SemiBold';

export function SerieBodyCard({
    number, last, lastLoad, repetitions, done, ownLoad, onPressNumber, onAddRepetition, onRemoveRepetition, onToggleDone,
}: SerieBodyCardProps) {
    const canRemove = repetitions > (done ? 1 : 0);
    const delta = last && repetitions > 0 ? repetitions - last.reps : null;

    return (
        <View flexDirection='row' bg={done ? '#4A4A4A' : '#525252'} w='100%' h='76px' px={3} mb={3} borderRadius={14} alignItems='center'>
            <TouchableOpacity
                onPress={onPressNumber}
                accessibilityRole='button'
                accessibilityLabel={`Carga da ${number}ª série`}
                style={{ width: 48, height: '100%', justifyContent: 'center' }}
            >
                <Text fontFamily={FONT} fontSize={20} color='white' allowFontScaling={false}>{number}ª</Text>
                {ownLoad !== undefined &&
                    <Text fontFamily={FONT} fontSize={12} lineHeight={16} color='#D9F99D' numberOfLines={1} allowFontScaling={false}>
                        {formatLoad(ownLoad)} kg
                    </Text>
                }
            </TouchableOpacity>

            <View w='48px' alignItems='center'>
                <Text fontFamily={FONT} fontSize={18} color='#D4D4D4' allowFontScaling={false}>{last?.reps ?? '–'}</Text>
                {last && last.loadKg !== lastLoad &&
                    <Text fontFamily={FONT} fontSize={11} lineHeight={14} color='#D4D4D4' numberOfLines={1} allowFontScaling={false}>
                        {formatLoad(last.loadKg)} kg
                    </Text>
                }
            </View>

            <View flex={1} flexDirection='row' alignItems='center' justifyContent='center'>
                <TouchableOpacity
                    onPress={onRemoveRepetition}
                    disabled={!canRemove}
                    hitSlop={6}
                    accessibilityLabel='Menos uma repetição'
                >
                    <AntDesign name='minussquare' size={34} color={canRemove ? '#D9F99D' : '#404040'} />
                </TouchableOpacity>

                <View w='52px' alignItems='center'>
                    <Text fontFamily={FONT} fontSize={24} lineHeight={30} color='white' allowFontScaling={false}>{repetitions}</Text>
                    {delta !== null &&
                        <Text
                            fontFamily={FONT}
                            fontSize={11}
                            lineHeight={14}
                            color={delta > 0 ? '#D9F99D' : delta < 0 ? '#FDBA74' : '#E5E5E5'}
                            allowFontScaling={false}
                        >
                            {formatDelta(delta)}
                        </Text>
                    }
                </View>

                <TouchableOpacity onPress={onAddRepetition} hitSlop={6} accessibilityLabel='Mais uma repetição'>
                    <AntDesign name='plussquare' size={34} color='#D9F99D' />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                onPress={onToggleDone}
                disabled={repetitions === 0}
                accessibilityRole='checkbox'
                accessibilityState={{ checked: done }}
                accessibilityLabel={`Concluir ${number}ª série`}
                style={{
                    width: 48,
                    height: 48,
                    marginLeft: 8,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: done ? '#D9F99D' : '#A3A3A3',
                    backgroundColor: done ? '#D9F99D' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: repetitions === 0 ? 0.4 : 1,
                }}
            >
                <MaterialIcons name='check' size={28} color={done ? '#1A1A1A' : '#A3A3A3'} />
            </TouchableOpacity>
        </View>
    );
}
