import { useCallback, useEffect, useState } from 'react';
import { View, Image, Text } from 'native-base';
import { Alert, FlatList, TouchableOpacity } from 'react-native';
import { moderateScale } from 'react-native-size-matters';

import BackgroundImage from '@assets/padrões.png';
import Add from '@assets/MAIS.png';

import { ButtonAdd } from '@components/ButtonAdd';
import { BackupButton } from '@components/BackupButton';
import { Card } from '@components/Card';

import { InputPopup } from '@components/InputPopup';

import { trainingsGetAll } from '@storage/training/trainingsGetAll';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Loading } from '@components/Loading';
import { trainingCreate } from '@storage/training/trainingCreate';
import { trainingRemoveByName } from '@storage/training/trainingRemoveByName';
import { trainingEdit } from '@storage/training/trainingEdit';
import { TrainingStorageDTO } from '@storage/training/TrainingStorageDTO';
import { AppError } from '@utils/AppError';

export function Training() {
    const navigation = useNavigation<ExerciseScreenNavigationProp>();

    const [trainings, setTrainings] = useState<TrainingStorageDTO[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTraining, setEditingTraining] = useState<TrainingStorageDTO | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);


    function handleNavigateToExercise(trainingName: string) {
        navigation.navigate('exercise', { trainingName });
    }

    const handleAddNewTraining = () => {
        setEditingTraining(undefined);
        setModalOpen(true);
    };

    const handleEditTraining = (training: TrainingStorageDTO) => {
        setEditingTraining(training); // Configura o treino em edição
        setModalOpen(true); // Abre o modal
    };

    // Função chamada ao salvar (editar ou criar)
    const handleSave = async (inputText: string) => {

        try {

            const name = inputText.trimEnd();

            if (name.trim().length === 0) {
                return Alert.alert('Novo Treino', 'Informe o nome do treino.');
            }

            if (editingTraining) {
                // Edição de treino existente
                const updatedTraining: TrainingStorageDTO = {
                    ...editingTraining,
                    name: name, // Atualiza apenas o nome, mantendo os exercícios
                };

                await trainingEdit(editingTraining, updatedTraining); // Chama a função de edição
            } else {
                // Criação de novo treino
                const newTraining: TrainingStorageDTO = {
                    name: name, // Nome fornecido pelo usuário
                    exercicies: [], // Inicialmente sem exercícios
                };

                await trainingCreate(newTraining); // Chama a função de criação
            }

            fetchTrainings(); // Atualiza a lista de treinos
            setModalOpen(false); // Fecha o modal
            setEditingTraining(undefined); // Reseta o estado de edição
        } catch (error) {
            console.log(error);

            if (error instanceof AppError) {
                Alert.alert('Erro', error.message);
            } else {
                Alert.alert('Erro', 'Ocorreu um erro desconhecido');
            }
        }
    };

    const trainingRemove = async (name: string) => {
        try {
            await trainingRemoveByName(name);
            fetchTrainings();
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível excluir o treino.')
        }
    };

    async function handleTrainingRemove(name: string) {
        Alert.alert(
            'Remover',
            'Deseja excluir o treino ?',
            [
                { text: 'Não', style: 'cancel' },
                { text: 'Sim', onPress: () => trainingRemove(name) }
            ]
        );
    }


    async function fetchTrainings() {
        try {
            setIsLoading(true);
            const data = await trainingsGetAll();
            const validTrainings = data.filter(training => training !== null && training !== undefined);
            setTrainings(validTrainings);
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível carregar os treinos.');
        } finally {
            setIsLoading(false);
        }
    }

    useFocusEffect(useCallback(() => {
        fetchTrainings();
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
                <View mt={100} alignItems='center'>
                    <Text
                        color='white'
                        fontSize={32}
                        fontFamily={'Poppins_600SemiBold'}
                        textAlign="center"
                        allowFontScaling={false}
                    >
                        TREINOS
                    </Text>
                    <TouchableOpacity onPress={handleAddNewTraining}>
                        <Image source={Add} alt='add' style={{ width: 52, height: 52 }} />
                    </TouchableOpacity>

                    {
                        isLoading ?
                            <Loading />
                            :
                            <FlatList
                                data={trainings}
                                keyExtractor={item => item.name}
                                renderItem={(item) => (
                                    <Card
                                        name={item.item.name}
                                        onPressTrash={() => handleTrainingRemove(item.item.name)}
                                        onPressEdit={() => handleEditTraining(item.item)}
                                        onPressNavigate={() => handleNavigateToExercise(item.item.name)}
                                    />
                                )}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24 }}
                            />
                    }
                </View>
                :
                <View flex={1} justifyContent={'center'}>
                    <ButtonAdd onPress={handleAddNewTraining} title='ADICIONE SEU TREINO' />
                </View>
            }

            <BackupButton />

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