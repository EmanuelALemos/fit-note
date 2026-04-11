import React, { useCallback, useState } from 'react';

import { View, Text, Image } from 'native-base';

import BackgroundImage from '@assets/padrões.png';
import Add from '@assets/MAIS.png';

import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { ButtonAdd } from '@components/ButtonAdd';
import { Alert, FlatList, TouchableOpacity } from 'react-native';

import { InputPopup } from '@components/InputPopup';
import { Loading } from '@components/Loading';
import { Card } from '@components/Card';
import { Header } from '@components/Header';

import { AntDesign } from '@expo/vector-icons';

import { ExerciseStorageDTO } from '@storage/exercise/ExerciseStorageDTO';
import { exerciseCreate } from '@storage/exercise/exerciseCreate';
import { trainingGetByName } from '@storage/training/trainingGetByName';
import { exerciseGetByName } from '@storage/exercise/exerciseGetByName';
import { trainingAddExercise } from '@storage/training/trainingAddExercise';
import { trainingRemoveExercise } from '@storage/training/trainingRemoveExercise';
import { exerciseGetAll } from '@storage/exercise/exerciseGetAll';
import { AppError } from '@utils/AppError';

interface RouteParams {
    trainingName: string;
}


export function Exercise() {

    const route = useRoute();

    const navigation = useNavigation<SeriesScreenNavigationProp>();

    const [exercises, setExercises] = useState<ExerciseStorageDTO[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { trainingName } = route.params as RouteParams;

    const handleAddNewExercise = () => {
        setModalOpen(true);
    };

    const handleSave = async (inputText: string) => {

        try {

            const name = inputText.trimEnd();

            if (name.trim().length === 0) {
                return Alert.alert('Novo Exercício', 'Informe o nome do exercício.');
            } else {
                // Criação de novo exercicio
                const storedExercises = await exerciseGetAll();

                const exerciseAlreadyExists = storedExercises.some(
                    (exercise: ExerciseStorageDTO) => exercise?.name === name
                );

                if (exerciseAlreadyExists) {
                    await trainingAddExercise(trainingName, name);
                } else {
                    const newExercise: ExerciseStorageDTO = {
                        name: name, // Nome fornecido pelo usuário
                        series: [], // Inicialmente sem exercícios
                        load: 0, // Inicialmente sem carga
                    };

                    await exerciseCreate(newExercise); // Chama a função de criação

                    await trainingAddExercise(trainingName, name);
                }
            }

            fetchExercises(); // Atualiza a lista de exercicios
            setModalOpen(false); // Fecha o modal

        } catch (error) {
            if (error instanceof AppError) {
                Alert.alert('Erro', error.message);
            } else {
                Alert.alert('Erro', 'Ocorreu um erro desconhecido');
            }
        }
    };

    async function exerciseRemove(name: string) {
        try {
            await trainingRemoveExercise(trainingName, name)
            fetchExercises();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível remover o exercício.');
            console.log(error);
        }
    }

    async function handleExerciseRemove(name: string) {
        Alert.alert(
            'Remover',
            'Deseja remover o exercício do treino ?',
            [
                { text: 'Não', style: 'cancel' },
                { text: 'Sim', onPress: () => exerciseRemove(name) }
            ]
        );
    }


    async function fetchExercises() {
        try {
            setIsLoading(true);

            // Obtém o treino pelo nome
            const data = await trainingGetByName(trainingName);

            // Filtra exercícios válidos (remover `null` ou `undefined`)
            const validExercises = data?.exercicies.filter(exercise => exercise !== null && exercise !== undefined);

            // Mapear exercícios e resolver todas as promessas com Promise.all
            if (validExercises) {
                const exercises = await Promise.all(
                    validExercises.map(async (exercise) => await exerciseGetByName(exercise))
                );

                setExercises(exercises.filter((exercise): exercise is ExerciseStorageDTO => exercise !== undefined))
            } else {
                setExercises([]);  // Se não houver exercícios válidos, define um array vazio
            }
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Não foi possível carregar os treinos.');
        } finally {
            setIsLoading(false);
        }
    }

    function handleNavigateSerie(name: string) {
        navigation.navigate('series', { exerciseName: name })
    }


    useFocusEffect(useCallback(() => {
        fetchExercises();
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
                        onAddPress={handleAddNewExercise}
                    />
                    <View mt={'48'} flex={1}>
                        {
                            isLoading ?
                                <Loading />
                                :
                                <FlatList
                                    data={exercises}
                                    keyExtractor={item => item.name}
                                    renderItem={(item) => (
                                        <Card
                                            name={item.item.name}
                                            onPressTrash={() => handleExerciseRemove(item.item.name)}
                                            canEdit={false}
                                            onPressNavigate={() => handleNavigateSerie(item.item.name)}
                                        />
                                    )}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ alignItems: 'center', paddingBottom: 50, paddingHorizontal: 24 }}
                                />
                        }
                    </View>
                </>
                :
                <>
                    <Header
                        onBackPress={() => navigation.goBack()}
                    />
                    <View flex={1} justifyContent={'center'}>
                        <ButtonAdd onPress={handleAddNewExercise} title='ADICIONE SEU EXERCÍCIO' />
                    </View>
                </>
            }

            <InputPopup
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                title='Exercício'
            />
        </View>
    );
}