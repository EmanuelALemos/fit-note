import { Text, View } from 'native-base';
import { Alert, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useDatabase } from '@database/DatabaseProvider';
import { formatClock, RestState } from '@database/rest';
import { AppError } from '@utils/AppError';

const FONT = 'Poppins_600SemiBold';

interface RestBarProps {
    exerciseId: number;
    restSeconds: number; // padrão do exercício
    rest: RestState | null;
    remainingSeconds: number;
    onChange: () => void;
    onEditDefault: () => void;
}

function SmallButton({ title, onPress, primary = false }: { title: string; onPress: () => void; primary?: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole='button'
            style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                backgroundColor: primary ? '#D9F99D' : '#525252',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text color={primary ? '#1A1A1A' : 'white'} fontSize={15} fontFamily={FONT} allowFontScaling={false}>{title}</Text>
        </TouchableOpacity>
    );
}

export function RestBar({ exerciseId, restSeconds, rest, remainingSeconds, onChange, onEditDefault }: RestBarProps) {
    const { repository: { workouts } } = useDatabase();

    function run(task: () => void) {
        try {
            task();
        } catch (error) {
            console.log(error);
            Alert.alert('Descanso', error instanceof AppError ? error.message : 'Não foi possível alterar o descanso.');
        } finally {
            onChange();
        }
    }

    if (!rest) {
        return (
            <View flexDirection='row' alignItems='center' h='60px' pl={4} pr={2} borderRadius={14} bg='#2E2E2E' borderWidth={1} borderColor='#6B6B6B'>
                <MaterialIcons name='timer' size={22} color='#D9F99D' />
                <TouchableOpacity
                    onPress={onEditDefault}
                    accessibilityRole='button'
                    accessibilityLabel={`Descanso padrão ${formatClock(restSeconds)}. Tocar para alterar`}
                    style={{ flex: 1, height: '100%', justifyContent: 'center', marginLeft: 10 }}
                >
                    <Text color='white' fontSize={16} fontFamily={FONT} allowFontScaling={false}>
                        Descanso <Text color='#D4D4D4' underline>{`· ${formatClock(restSeconds)}`}</Text>
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => run(() => workouts.rest.start(exerciseId, null))}
                    accessibilityRole='button'
                    style={{ height: 44, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#D9F99D', justifyContent: 'center' }}
                >
                    <Text color='#1A1A1A' fontSize={15} fontFamily={FONT} allowFontScaling={false}>Iniciar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const endsAt = new Date(rest.endsAt);
    const progress = Math.min(1, Math.max(0, remainingSeconds / rest.totalSeconds));
    const other = rest.exerciseId !== exerciseId;

    return (
        <View p={4} borderRadius={16} bg='#2E2E2E' borderWidth={2} borderColor='#D9F99D'>
            <View flexDirection='row' justifyContent='space-between' alignItems='center'>
                <Text flex={1} mr={2} color='#E5E5E5' fontSize={14} numberOfLines={1} fontFamily={FONT} allowFontScaling={false}>
                    {other ? `DESCANSO · ${rest.exerciseName.toUpperCase()}` : 'DESCANSO'}
                </Text>
                <Text color='#D4D4D4' fontSize={12} fontFamily={FONT} allowFontScaling={false}>
                    {`termina às ${String(endsAt.getHours()).padStart(2, '0')}:${String(endsAt.getMinutes()).padStart(2, '0')}`}
                </Text>
            </View>

            <View flexDirection='row' alignItems='baseline' justifyContent='center' my={1}>
                <Text color='#D9F99D' fontSize={48} lineHeight={60} fontFamily={FONT} allowFontScaling={false}>
                    {formatClock(remainingSeconds)}
                </Text>
                <Text ml={2} color='#D4D4D4' fontSize={14} fontFamily={FONT} allowFontScaling={false}>
                    {`de ${formatClock(rest.totalSeconds)}`}
                </Text>
            </View>

            <View h='6px' mb={3} borderRadius={3} bg='#525252' overflow='hidden'>
                <View h='100%' bg='#D9F99D' style={{ width: `${progress * 100}%` }} />
            </View>

            <View flexDirection='row' style={{ gap: 8 }}>
                <SmallButton title='−15s' onPress={() => run(() => workouts.rest.adjust(-15))} />
                <SmallButton title='+15s' onPress={() => run(() => workouts.rest.adjust(15))} />
                <SmallButton title='Pular' primary onPress={() => run(() => workouts.rest.clear())} />
            </View>
        </View>
    );
}
