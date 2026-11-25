import { Text, View } from 'native-base';
import { Alert, TouchableOpacity } from 'react-native';

import { useDatabase } from '@database/DatabaseProvider';
import { OpenWorkout } from '@database/workouts';
import { AppError } from '@utils/AppError';
import { formatDuration } from '@utils/format';

import { ActionButton } from './ActionButton';

interface WorkoutBarProps {
    trainingId: number;
    open: OpenWorkout | null;
    onChange: () => void;
    onFinished: (sessionId: number) => void;
}

export function WorkoutBar({ trainingId, open, onChange, onFinished }: WorkoutBarProps) {
    const { repository: { workouts } } = useDatabase();

    function run(task: () => void) {
        try {
            task();
        } catch (error) {
            console.log(error);
            Alert.alert('Treino', error instanceof AppError ? error.message : 'Não foi possível salvar o treino.');
        } finally {
            onChange();
        }
    }

    function handleDiscard(workout: OpenWorkout) {
        const sets = workout.completedSets;

        Alert.alert(
            'Descartar treino',
            sets === 0
                ? `Descartar ${workout.trainingName}? Nenhuma série foi concluída.`
                : `Descartar ${workout.trainingName}? ${sets === 1 ? 'A série concluída será apagada' : `As ${sets} séries concluídas serão apagadas`}. Não dá para desfazer.`,
            [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Descartar', style: 'destructive', onPress: () => run(() => workouts.discard(workout.id)) },
            ]
        );
    }

    function handleFinish(workout: OpenWorkout) {
        if (workout.completedSets === 0) {
            return handleDiscard(workout);
        }

        Alert.alert(
            'Finalizar treino',
            `${workout.trainingName}: ${workout.completedSets} ${workout.completedSets === 1 ? 'série concluída' : 'séries concluídas'}. Séries sem ✓ não são guardadas.`,
            [
                { text: 'Voltar', style: 'cancel' },
                {
                    text: 'Finalizar',
                    onPress: () => run(() => {
                        if (workouts.finish(workout.id)) {
                            onFinished(workout.id);
                        }
                    }),
                },
            ]
        );
    }

    if (!open) {
        return <ActionButton title='INICIAR TREINO' onPress={() => run(() => workouts.start(trainingId))} />;
    }

    const elapsed = formatDuration(Date.now() - new Date(open.startedAt).getTime());

    return (
        <View>
            <View flexDirection='row' alignItems='center' justifyContent='space-between' mb={2}>
                <Text flex={1} mr={3} color='#D9F99D' fontSize={14} numberOfLines={1} fontFamily={'Poppins_600SemiBold'} allowFontScaling={false}>
                    {`● ${open.trainingName} em andamento · ${elapsed}`}
                </Text>
                <TouchableOpacity onPress={() => handleDiscard(open)} hitSlop={12} accessibilityRole='button'>
                    <Text color='white' fontSize={14} underline fontFamily={'Poppins_600SemiBold'} allowFontScaling={false}>Descartar</Text>
                </TouchableOpacity>
            </View>
            <ActionButton
                title={open.trainingId === trainingId ? 'FINALIZAR TREINO' : `FINALIZAR ${open.trainingName.toUpperCase()}`}
                onPress={() => handleFinish(open)}
            />
        </View>
    );
}
