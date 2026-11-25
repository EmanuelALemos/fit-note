import React, { useCallback, useState } from 'react';

import { View, Image } from 'native-base';

import BackgroundImage from '@assets/padrões.png';

import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ButtonAdd } from '@components/ButtonAdd';
import { Alert, FlatList } from 'react-native';

import { InputPopup } from '@components/InputPopup';
import { Loading } from '@components/Loading';
import { Card } from '@components/Card';
import { Header } from '@components/Header';

import { ExerciseStorageDTO } from '@storage/exercise/ExerciseStorageDTO';
import { exerciseCreate } from '@storage/exercise/exerciseCreate';
import { trainingGetByName } from '@storage/training/trainingGetByName';
import { exerciseGetByName } from '@storage/exercise/exerciseGetByName';
import { trainingAddExercise } from '@storage/training/trainingAddExercise';
import { trainingRemoveExercise } from '@storage/training/trainingRemoveExercise';
import { exerciseGetAll } from '@storage/exercise/exerciseGetAll';
import { ExerciseScreenProps } from '@routes/routeTypes';
import { AppError } from '@utils/AppError';

export function Exercise({ navigation, route }: ExerciseScreenProps) {

    const insets = useSafeAreaInsets();

    const [exercises, setExercises] = useState<ExerciseStorageDTO[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { trainingName } = route.params;

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
            Alert.alert('Erro', 'Não foi possível carregar os exercícios.');
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

            {isLoading ?
                <Loading />
                : exercises.length !== 0 ?
                    <>
                        <Header
                            title='EXERCÍCIOS'
                            subtitle={trainingName}
                            onBackPress={() => navigation.goBack()}
                            onAddPress={handleAddNewExercise}
                        />
                        <FlatList
                            data={exercises}
                            keyExtractor={item => item.name}
                            renderItem={({ item }) => (
                                <Card
                                    name={item.name}
                                    onPressTrash={() => handleExerciseRemove(item.name)}
                                    canEdit={false}
                                    onPressNavigate={() => handleNavigateSerie(item.name)}
                                />
                            )}
                            showsVerticalScrollIndicator={false}
                            style={{ flex: 1, width: '100%' }}
                            contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
                        />
                    </>
                    :
                    <>
                        <Header onBackPress={() => navigation.goBack()} />
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