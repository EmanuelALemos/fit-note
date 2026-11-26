import React, { useState } from 'react';
import { View, Text, Image } from 'native-base';
import { FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import BackgroundImage from '@assets/padrões.png';

import { ExerciseLoadCard } from '@components/ExerciseLoadCard';
import { Header } from '@components/Header';
import { InputPopup } from '@components/InputPopup';
import { RestBar } from '@components/RestBar';
import { SerieBodyCard } from '@components/SerieBodyCard';
import { SerieHeaderCard } from '@components/SerieHeaderCard';

import { useDatabase } from '@database/DatabaseProvider';
import { formatClock, parseRestSeconds } from '@database/rest';
import { PlannedSet } from '@database/workouts';

import { SeriesScreenProps } from '@routes/routeTypes';
import { AppError } from '@utils/AppError';
import { formatDuration, formatTarget } from '@utils/format';
import { formatLoad, parseLoad } from '@utils/load';
import { useRefresh } from '@utils/useRefresh';
import { useRest } from '@utils/useRest';

const FONT = 'Poppins_600SemiBold';

// Carga em edição: a do exercício ou a de uma série.
type LoadEditing = 'exercise' | number | null;

export function Series({ navigation, route }: SeriesScreenProps) {

    const { trainingId, exerciseId, exerciseName } = route.params;

    const insets = useSafeAreaInsets();
    const { repository: { workouts } } = useDatabase();

    const read = () => ({ open: workouts.getOpen(), exercise: workouts.getExercise(exerciseId) });

    const [view, setView] = useState(read);
    const [editing, setEditing] = useState<LoadEditing>(null);
    const [editingRest, setEditingRest] = useState(false);
    const { rest, remainingSeconds, changed: restChanged } = useRest();

    const { open, exercise } = view;
    const { sets, last, loadKg } = exercise;

    function refresh(keepDraft = true) {
        try {
            const next = read();

            setView(previous => {
                // Ajustes feitos na sugestão, ainda sem ✓, não se perdem ao atualizar a tela.
                const sameDraft = keepDraft && !previous.exercise.saved && !next.exercise.saved;
                return sameDraft ? { ...next, exercise: { ...next.exercise, sets: previous.exercise.sets } } : next;
            });
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar o exercício');
            console.log(error);
        }
    }

    // A gravação é síncrona: quando termina, a tela já pode reler o que ficou salvo.
    function write(save: () => void, errorMessage: string): boolean {
        try {
            save();
            return true;
        } catch (error) {
            Alert.alert('Erro', error instanceof AppError ? error.message : errorMessage);
            console.log(error);
            return false;
        } finally {
            refresh();
            restChanged();
        }
    }

    function changeDraft(change: (sets: PlannedSet[]) => PlannedSet[]) {
        setView(previous => ({
            ...previous,
            exercise: { ...previous.exercise, sets: change(previous.exercise.sets) },
        }));
    }

    function handleAddSerie() {
        if (open) {
            write(() => workouts.addSet(exerciseId, sets), 'Não foi possível adicionar a série');
        } else if (write(() => workouts.setDefaultSets(exerciseId, sets.length + 1), 'Não foi possível adicionar a série')) {
            changeDraft(current => [...current, {
                loadKg, reps: current[current.length - 1]?.reps ?? exercise.targetMin ?? 0, done: false,
            }]);
        }
    }

    function removeSerie() {
        if (open) {
            write(() => workouts.removeLastSet(exerciseId, sets), 'Não foi possível remover a série');
        } else if (write(() => workouts.setDefaultSets(exerciseId, sets.length - 1), 'Não foi possível remover a série')) {
            changeDraft(current => current.slice(0, -1));
        }
    }

    function handleRemoveSerie() {
        if (!sets[sets.length - 1]?.done) {
            return removeSerie();
        }

        Alert.alert('Remover', 'A última série já foi concluída. Deseja remover ?', [
            { text: 'Não', style: 'cancel' },
            { text: 'Sim', onPress: removeSerie },
        ]);
    }

    function handleChangeRepetitions(index: number, delta: number) {
        if (open) {
            write(
                () => workouts.changeRepetitions(exerciseId, index + 1, delta, sets),
                'Não foi possível alterar as repetições'
            );
        } else {
            changeDraft(current => current.map((set, position) =>
                position === index ? { ...set, reps: Math.max(0, set.reps + delta) } : set
            ));
        }
    }

    function handleToggleDone(index: number) {
        write(
            () => workouts.setDone(trainingId, exerciseId, index + 1, !sets[index].done, sets),
            'Não foi possível concluir a série'
        );
    }

    function saveExerciseLoad(newLoad: number): boolean {
        const saved = write(() => workouts.setLoad(exerciseId, newLoad), 'Não foi possível salvar a carga');

        if (saved && !exercise.saved) {
            changeDraft(current => current.map(set => set.loadKg === loadKg ? { ...set, loadKg: newLoad } : set));
        }

        return saved;
    }

    function saveSetLoad(index: number, newLoad: number): boolean {
        if (open) {
            return write(
                () => workouts.setSetLoad(exerciseId, index + 1, newLoad, sets),
                'Não foi possível salvar a carga'
            );
        }

        changeDraft(current => current.map((set, position) => position === index ? { ...set, loadKg: newLoad } : set));
        return true;
    }

    async function handleSaveLoad(inputText: string) {
        const newLoad = parseLoad(inputText);

        if (newLoad === null) {
            Alert.alert('Erro', `"${inputText}" não é uma carga válida`);
            return;
        }

        if (editing === null || (editing === 'exercise' ? saveExerciseLoad(newLoad) : saveSetLoad(editing, newLoad))) {
            setEditing(null);
        }
    }

    async function handleSaveRest(inputText: string) {
        const seconds = parseRestSeconds(inputText);

        if (seconds === null) {
            Alert.alert('Descanso', 'Use minutos:segundos, como 1:30, ou só os segundos.');
            return;
        }

        if (write(() => workouts.rest.setSeconds(exerciseId, seconds), 'Não foi possível salvar o descanso')) {
            setEditingRest(false);
        }
    }

    useRefresh(refresh);

    const target = formatTarget(exercise.targetMin, exercise.targetMax);
    const max = exercise.targetMax ?? 0;
    const reached = (marks: { reps: number; loadKg: number }[]) =>
        marks.length > 0 && marks.every(set => set.reps >= max && set.loadKg >= loadKg);
    const allDone = sets.length > 0 && sets.every(set => set.done);
    const shouldIncrease = allDone ? reached(sets) : reached(last?.sets ?? []);

    const elapsed = open && formatDuration(Date.now() - new Date(open.startedAt).getTime());

    return (
        <View bg='#404040' flex={1} alignItems='center'>
            <Image source={BackgroundImage} alt='Background' position='absolute' top={0} left={0} right={0} bottom={0} />

            <Header
                title={exerciseName.toUpperCase()}
                onTitlePress={() => navigation.navigate('history', { exerciseId, exerciseName })}
                status={open ? `● ${open.trainingName} em andamento · ${elapsed}` : undefined}
                onBackPress={() => navigation.goBack()}
            />

            <View flex={1} w='100%' px={6} pt={2}>
                <SerieHeaderCard
                    series={sets.length}
                    minimum={open ? 1 : 0}
                    onAddSerie={handleAddSerie}
                    onRemoveSerie={handleRemoveSerie}
                />

                {sets.length > 0 &&
                    <View flexDirection='row' px={3} mb={2}>
                        <Text w='48px' color='#E5E5E5' fontSize={11} fontFamily={FONT} allowFontScaling={false}>SÉRIE</Text>
                        <Text w='48px' textAlign='center' color='#E5E5E5' fontSize={11} fontFamily={FONT} allowFontScaling={false}>ÚLTIMA</Text>
                        <Text flex={1} textAlign='center' color='#E5E5E5' fontSize={11} fontFamily={FONT} allowFontScaling={false}>
                            HOJE (repetições)
                        </Text>
                        <View w='56px' />
                    </View>
                }

                <FlatList
                    data={sets}
                    keyExtractor={(_, index) => String(index)}
                    renderItem={({ item, index }) => (
                        <SerieBodyCard
                            number={index + 1}
                            last={last?.sets[index]}
                            lastLoad={last?.loadKg}
                            repetitions={item.reps}
                            done={item.done}
                            ownLoad={item.loadKg !== loadKg ? item.loadKg : undefined}
                            onPressNumber={() => setEditing(index)}
                            onAddRepetition={() => handleChangeRepetitions(index, 1)}
                            onRemoveRepetition={() => handleChangeRepetitions(index, -1)}
                            onToggleDone={() => handleToggleDone(index)}
                        />
                    )}
                    ListEmptyComponent={
                        <Text mt={10} textAlign='center' color='white' fontSize={24} fontFamily={FONT} allowFontScaling={false}>
                            Nenhuma série cadastrada
                        </Text>
                    }
                    ListFooterComponent={target ?
                        <View flexDirection='row' alignItems='center' px={3} py={2} borderRadius={12} bg='#262626'>
                            <MaterialIcons name='trending-up' size={20} color='#D9F99D' />
                            <Text flex={1} ml={2} color={shouldIncrease ? '#D9F99D' : 'white'} fontSize={13} fontFamily={FONT} allowFontScaling={false}>
                                {shouldIncrease
                                    ? `Você fez ${max} em todas as séries. Que tal subir a carga?`
                                    : `Faixa alvo ${target}`}
                            </Text>
                        </View>
                        : null
                    }
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                />

                <View pt={3} style={{ paddingBottom: insets.bottom + 16 }}>
                    <RestBar
                        exerciseId={exerciseId}
                        restSeconds={exercise.restSeconds}
                        rest={rest}
                        remainingSeconds={remainingSeconds}
                        onChange={restChanged}
                        onEditDefault={() => setEditingRest(true)}
                    />
                    <View h='12px' />
                    <ExerciseLoadCard load={loadKg} lastLoad={last?.loadKg} onPressEdit={() => setEditing('exercise')} />
                </View>
            </View>

            <InputPopup
                isOpen={editingRest}
                onClose={() => setEditingRest(false)}
                onSave={handleSaveRest}
                initialText={formatClock(exercise.restSeconds)}
                placeholder='1:30'
                hint='Minutos:segundos. Vale para os próximos descansos deste exercício.'
                title='Descanso'
                keyboardType='numbers-and-punctuation'
            />

            <InputPopup
                isOpen={editing !== null}
                onClose={() => setEditing(null)}
                onSave={handleSaveLoad}
                initialText={formatLoad(typeof editing === 'number' ? sets[editing]?.loadKg ?? loadKg : loadKg)}
                hint={typeof editing === 'number' ? `Vale só para a ${editing + 1}ª série de hoje.` : undefined}
                title='Carga'
                keyboardType='decimal-pad'
            />
        </View>
    );
}
