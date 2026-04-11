import React, { useCallback, useState } from "react";

import { View, Text, Image } from "native-base";

import BackgroundImage from "@assets/padrões.png";
import { TouchableOpacity, FlatList, Alert } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import { AntDesign } from "@expo/vector-icons";

import { SerieHeaderCard } from "@components/SerieHeaderCard";
import { SerieBodyCard } from "@components/SerieBodyCard";
import { ExerciseLoadCard } from "@components/ExerciseLoadCard";
import { Header } from "@components/Header";

import { exerciseGetByName } from "@storage/exercise/exerciseGetByName";
import { exerciseEditLoad } from "@storage/exercise/exerciseEditLoad";
import { InputPopup } from "@components/InputPopup";
import { exerciseAddSerie } from "@storage/exercise/exerciseAddSerie";
import { SeriesStorageDTO } from "@storage/series/SeriesStorageDTO";
import { exerciseRemoveSerie } from "@storage/exercise/exerciseRemoveSerie";
import { exerciseAddRepetition } from "@storage/exercise/exerciseAddRepetition";
import { exerciseRemoveRepetition } from "@storage/exercise/exerciseRemoveRepetiton";

interface RouteParams {
    exerciseName: string;
}

interface SerieType {
    name: string;
    repetitions: number;
}

export function Series() {

    const route = useRoute();

    const { exerciseName } = route.params as RouteParams;

    const navigation = useNavigation();

    const [series, setSeries] = useState<SerieType[]>([]);
    const [load, setLoad] = useState<number | undefined>(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLoad, setEditingLoad] = useState('0');
    const [serieNumber, setSerieNumber] = useState(0);

    async function handleAddSerie() {
        try {

            const newSerie: SeriesStorageDTO = {
                repetitions: 0,
                exerciseId: exerciseName,
                name: `${serieNumber + 1}° série`
            }

            await exerciseAddSerie(exerciseName, newSerie)
            setSerieNumber(serieNumber + 1);
            getExercise();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível adicionar a série');
            console.log(error);
        }
    }

    async function handleRemoveSerie(exerciseName: string, serieName: string) {
        try {
            await exerciseRemoveSerie(exerciseName, serieName);
            setSerieNumber(serieNumber - 1);

            getExercise();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível remover a série');
            console.error(error);
        }
    }

    async function handleAddRepetition(exerciseName: string, serieName: string) {
        try {
            await exerciseAddRepetition(exerciseName, serieName);

            getExercise();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível adicionar a repetição');
            console.log(error);
        }
    }

    async function handleRemoveRepetition(exerciseName: string, serieName: string) {
        try {
            await exerciseRemoveRepetition(exerciseName, serieName);

            getExercise();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível remover a repetição');
            console.log(error);
        }
    }


    async function getExercise() {
        try {
            const exercise = await exerciseGetByName(exerciseName);

            const seriesStored = exercise?.series;
            const loadExercise = exercise?.load;

            const series = seriesStored?.map((serie) => {
                return {
                    name: serie.name,
                    repetitions: serie.repetitions,
                };
            })

            if (series) {
                setSeries(series);
                setSerieNumber(series.length);
            }
            setLoad(loadExercise);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar o exercício');
            console.error(error);
        }
    }


    async function handleSave(inputText: string) {
        try {
            const load = parseInt(inputText);

            if (isNaN(load)) {
                Alert.alert('Erro', `${inputText} não é um número válido`);
                return;
            }
            await handleEditLoad(load);
            setModalOpen(false);

        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar a carga');
            console.error(error);
        }
    }

    async function handleEditLoad(load: number) {
        try {
            await exerciseEditLoad(exerciseName, load);
            setLoad(load);
        } catch (error) {
            console.error(error);
        }
    }

    function handleEditLoadClick() {
        setEditingLoad(String(load));
        setModalOpen(true);
    }

    useFocusEffect(useCallback(() => {
        getExercise();
    }, []));

    return (
        <View bg='#404040' flex={1} alignItems='center'>
            <Image source={BackgroundImage} alt='Background' position='absolute' top={0} left={0} right={0} bottom={0} />

            <Header
                title={exerciseName.toUpperCase()}
                onBackPress={() => navigation.goBack()}
            />
            
            <SerieHeaderCard series={serieNumber} onAddSerie={handleAddSerie} onRemoveSerie={() => handleRemoveSerie(exerciseName, `${serieNumber}° série`)} />

            {serieNumber === 0 ? (
                <View mt={100} alignItems='center'>
                    <Text color='white' fontSize={24} fontFamily={'Poppins_600SemiBold'}  allowFontScaling={false} >
                        Nenhuma série cadastrada
                    </Text>
                </View>
            ) : (
                // Container com altura flexível para a lista
                <View flex={1} alignItems='center' justifyContent='flex-start' style={{ marginBottom: 150 }}>
                    <FlatList
                        data={series}
                        keyExtractor={item => item.name}
                        renderItem={({ item }) => (
                            <SerieBodyCard
                                serie={item.name}
                                onAddRepetition={() => handleAddRepetition(exerciseName, item.name)}
                                onRemoveRepetition={() => handleRemoveRepetition(exerciseName, item.name)}
                                repetitions={item.repetitions}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            alignItems: 'center',
                            paddingRight: 24,
                            paddingLeft: 24,
                        }}
                        style={{
                            maxHeight: 440, // Limita a altura da FlatList para evitar sobreposição
                        }}
                    />
                </View>
            )}

            {/* Card de Carga posicionado abaixo da lista */}
            <View position='absolute' bottom={12} left={5}>
                <ExerciseLoadCard load={load} onPressEdit={handleEditLoadClick} />
            </View>

            <InputPopup
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initialText={editingLoad}
                title='Carga'
            />
        </View>

    );
}