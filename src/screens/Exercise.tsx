import React, { useCallback, useState } from 'react';
import { View, Image } from 'native-base';
import { Alert } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BackgroundImage from '@assets/padrões.png';

import { ButtonAdd } from '@components/ButtonAdd';
import { Card } from '@components/Card';
import { CardMenu } from '@components/CardMenu';
import { Header } from '@components/Header';
import { InputPopup } from '@components/InputPopup';

import { useDatabase } from '@database/DatabaseProvider';
import { Exercise as ExerciseItem } from '@database/repository';

import { ExerciseScreenProps } from '@routes/routeTypes';
import { AppError } from '@utils/AppError';

export function Exercise({ navigation, route }: ExerciseScreenProps) {
    const { trainingId, trainingName } = route.params;

    const insets = useSafeAreaInsets();
    const { repository } = useDatabase();

    const [exercises, setExercises] = useState(() => repository.listExercises(trainingId));
    const [modalOpen, setModalOpen] = useState(false);
    const [renaming, setRenaming] = useState<ExerciseItem & { hint: string } | undefined>(undefined);
    const [menuExercise, setMenuExercise] = useState<ExerciseItem | undefined>(undefined);

    function refresh() {
        try {
            setExercises(repository.listExercises(trainingId));
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível carregar os exercícios.');
        }
    }

    function handleAdd() {
        setRenaming(undefined);
        setModalOpen(true);
    }

    function handleRename(exercise: ExerciseItem) {
        try {
            const total = repository.countTrainingsWithExercise(exercise.id);
            const hint = total === 1
                ? 'Está só neste treino.'
                : `Está em ${total} treinos; o nome muda em todos.`;

            setRenaming({ ...exercise, hint });
            setModalOpen(true);
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível carregar o exercício.');
        }
    }

    async function handleSave(inputText: string) {
        try {
            const name = inputText.trim();

            if (name.length === 0) {
                return Alert.alert('Exercício', 'Informe o nome do exercício.');
            }

            if (renaming) {
                repository.renameExercise(renaming.id, name);
            } else {
                repository.addExercise(trainingId, name);
            }

            refresh();
            setModalOpen(false);
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', error instanceof AppError ? error.message : 'Ocorreu um erro desconhecido');
        }
    }

    function exerciseRemove(id: number) {
        try {
            repository.removeExercise(trainingId, id);
            refresh();
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível remover o exercício.');
        }
    }

    function handleExerciseRemove(id: number) {
        Alert.alert(
            'Remover',
            'Deseja remover o exercício do treino ?',
            [
                { text: 'Não', style: 'cancel' },
                { text: 'Sim', onPress: () => exerciseRemove(id) }
            ]
        );
    }

    function handleReorder(reordered: ExerciseItem[]) {
        setExercises(reordered);

        try {
            repository.reorderExercises(trainingId, reordered.map(item => item.id));
        } catch (error) {
            console.log(error);
            refresh();
            Alert.alert('Erro', error instanceof AppError ? error.message : 'Não foi possível salvar a ordem.');
        }
    }

    useFocusEffect(useCallback(() => {
        refresh();
    }, []));

    return (
        <View bg='#404040' flex={1} alignItems='center'>
            <Image source={BackgroundImage} alt='Background' position='absolute' top={0} left={0} right={0} bottom={0} />

            {exercises.length !== 0 ?
                <>
                    <Header
                        title='EXERCÍCIOS'
                        subtitle={trainingName}
                        onBackPress={() => navigation.goBack()}
                        onAddPress={handleAdd}
                    />
                    <DraggableFlatList
                        data={exercises}
                        keyExtractor={item => String(item.id)}
                        renderItem={({ item, drag, isActive }) => (
                            <Card
                                name={item.name}
                                onPressMenu={() => setMenuExercise(item)}
                                onDrag={drag}
                                isDragging={isActive}
                                onPressNavigate={() => navigation.navigate('series', {
                                    exerciseId: item.id,
                                    exerciseName: item.name,
                                })}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        onDragEnd={({ from, to, data }) => from !== to && handleReorder(data)}
                        containerStyle={{ flex: 1, width: '100%' }}
                        contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
                    />
                </>
                :
                <>
                    <Header onBackPress={() => navigation.goBack()} />
                    <View flex={1} justifyContent={'center'}>
                        <ButtonAdd onPress={handleAdd} title='ADICIONE SEU EXERCÍCIO' />
                    </View>
                </>
            }

            {menuExercise &&
                <CardMenu
                    isOpen
                    onClose={() => setMenuExercise(undefined)}
                    title={menuExercise.name}
                    options={[
                        { label: 'Renomear', icon: 'edit', onPress: () => handleRename(menuExercise) },
                        { label: 'Remover do treino', icon: 'delete', onPress: () => handleExerciseRemove(menuExercise.id) },
                    ]}
                />
            }

            <InputPopup
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initialText={renaming?.name}
                hint={renaming?.hint}
                title='Exercício'
            />
        </View>
    );
}
