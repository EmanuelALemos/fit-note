import { useCallback, useState } from 'react';
import { View, Image } from 'native-base';
import { Alert } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BackgroundImage from '@assets/padrões.png';

import { BackupButton } from '@components/BackupButton';
import { ButtonAdd } from '@components/ButtonAdd';
import { Card } from '@components/Card';
import { CardMenu } from '@components/CardMenu';
import { Header } from '@components/Header';
import { ImportButton } from '@components/ImportButton';
import { InputPopup } from '@components/InputPopup';

import { useDatabase } from '@database/DatabaseProvider';
import { TrainingSummary } from '@database/repository';

import { TrainingScreenProps } from '@routes/routeTypes';
import { AppError } from '@utils/AppError';

export function Training({ navigation }: TrainingScreenProps) {
    const insets = useSafeAreaInsets();
    const { repository } = useDatabase();

    const [trainings, setTrainings] = useState(() => repository.listTrainings());
    const [canImport, setCanImport] = useState(() => repository.isEmpty());
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTraining, setEditingTraining] = useState<TrainingSummary | undefined>(undefined);
    const [menuTraining, setMenuTraining] = useState<TrainingSummary | undefined>(undefined);

    function refresh() {
        try {
            setTrainings(repository.listTrainings());
            setCanImport(repository.isEmpty());
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível carregar os treinos.');
        }
    }

    function handleAddNewTraining() {
        setEditingTraining(undefined);
        setModalOpen(true);
    }

    function handleEditTraining(training: TrainingSummary) {
        setEditingTraining(training);
        setModalOpen(true);
    }

    async function handleSave(inputText: string) {
        try {
            const name = inputText.trim();

            if (name.length === 0) {
                return Alert.alert('Novo Treino', 'Informe o nome do treino.');
            }

            if (editingTraining) {
                repository.renameTraining(editingTraining.id, name);
            } else {
                repository.createTraining(name);
            }

            refresh();
            setModalOpen(false);
            setEditingTraining(undefined);
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', error instanceof AppError ? error.message : 'Ocorreu um erro desconhecido');
        }
    }

    function trainingRemove(id: number) {
        try {
            repository.removeTraining(id);
            refresh();
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível excluir o treino.');
        }
    }

    function handleTrainingRemove(id: number) {
        Alert.alert(
            'Remover',
            'Deseja excluir o treino ?',
            [
                { text: 'Não', style: 'cancel' },
                { text: 'Sim', onPress: () => trainingRemove(id) }
            ]
        );
    }

    function handleReorder(reordered: TrainingSummary[]) {
        setTrainings(reordered);

        try {
            repository.reorderTrainings(reordered.map(item => item.id));
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
        <View bg='#404040' flex={1} justifyContent="center" alignItems='center'>
            <Image
                source={BackgroundImage}
                alt='Background'
                position='absolute'
                top={0}
                left={0}
                right={0}
                bottom={0}
                resizeMode='cover'
            />

            {trainings.length !== 0 ?
                <>
                    <Header title='TREINOS' onAddPress={handleAddNewTraining} />
                    <DraggableFlatList
                        data={trainings}
                        keyExtractor={item => String(item.id)}
                        renderItem={({ item, drag, isActive }) => (
                            <Card
                                name={item.name}
                                details={`${item.exerciseCount} ${item.exerciseCount === 1 ? 'exercício' : 'exercícios'}`}
                                onPressMenu={() => setMenuTraining(item)}
                                onDrag={drag}
                                isDragging={isActive}
                                onPressNavigate={() => navigation.navigate('exercise', {
                                    trainingId: item.id,
                                    trainingName: item.name,
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
                <View flex={1} justifyContent={'center'}>
                    <ButtonAdd onPress={handleAddNewTraining} title='ADICIONE SEU TREINO' />
                    {canImport && <ImportButton onImported={refresh} />}
                </View>
            }

            <BackupButton />

            {menuTraining &&
                <CardMenu
                    isOpen
                    onClose={() => setMenuTraining(undefined)}
                    title={menuTraining.name}
                    options={[
                        { label: 'Renomear', icon: 'edit', onPress: () => handleEditTraining(menuTraining) },
                        { label: 'Excluir', icon: 'delete', onPress: () => handleTrainingRemove(menuTraining.id) },
                    ]}
                />
            }

            <InputPopup
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initialText={editingTraining?.name}
                title='Treino'
            />
        </View>
    )
}
