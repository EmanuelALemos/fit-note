import React, { useCallback, useRef, useState } from "react";

import { View, Text, Image } from "native-base";

import BackgroundImage from "@assets/padrões.png";
import { FlatList, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SerieHeaderCard } from "@components/SerieHeaderCard";
import { SerieBodyCard } from "@components/SerieBodyCard";
import { ExerciseLoadCard } from "@components/ExerciseLoadCard";
import { Header } from "@components/Header";
import { InputPopup } from "@components/InputPopup";
import { Loading } from "@components/Loading";

import { exerciseGetByName } from "@storage/exercise/exerciseGetByName";
import { exerciseEditLoad } from "@storage/exercise/exerciseEditLoad";
import { exerciseAddSerie } from "@storage/exercise/exerciseAddSerie";
import { exerciseRemoveLastSerie } from "@storage/exercise/exerciseRemoveLastSerie";
import { exerciseChangeRepetitions } from "@storage/exercise/exerciseChangeRepetitions";

import { SeriesScreenProps } from "@routes/routeTypes";
import { formatLoad, parseLoad } from "@utils/load";

export function Series({ navigation, route }: SeriesScreenProps) {

    const { exerciseName } = route.params;

    const insets = useSafeAreaInsets();

    const [repetitions, setRepetitions] = useState<number[]>([]); // uma posição por série
    const [load, setLoad] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const pendingWrites = useRef(0);

    async function getExercise() {
        try {
            const exercise = await exerciseGetByName(exerciseName);

            // Há toques mais novos que esta leitura: a última escrita recarrega a tela.
            if (pendingWrites.current > 0) {
                return;
            }

            setRepetitions(exercise?.series?.map(serie => serie.repetitions) ?? []);
            setLoad(exercise?.load ?? 0);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar o exercício');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Atualiza a tela na hora e confere com o que foi gravado quando os toques param.
    async function write(optimisticUpdate: () => void, save: () => Promise<void>, errorMessage: string) {
        pendingWrites.current++;
        optimisticUpdate();

        try {
            await save();
        } catch (error) {
            Alert.alert('Erro', errorMessage);
            console.log(error);
        } finally {
            pendingWrites.current--;

            if (pendingWrites.current === 0) {
                getExercise();
            }
        }
    }

    function handleAddSerie() {
        write(
            () => setRepetitions(current => [...current, 0]),
            () => exerciseAddSerie(exerciseName),
            'Não foi possível adicionar a série'
        );
    }

    function handleRemoveSerie() {
        write(
            () => setRepetitions(current => current.slice(0, -1)),
            () => exerciseRemoveLastSerie(exerciseName),
            'Não foi possível remover a série'
        );
    }

    function handleChangeRepetitions(serieIndex: number, delta: number) {
        write(
            () => setRepetitions(current => current.map((value, index) =>
                index === serieIndex ? Math.max(0, value + delta) : value
            )),
            () => exerciseChangeRepetitions(exerciseName, serieIndex, delta),
            'Não foi possível alterar as repetições'
        );
    }

    async function handleSave(inputText: string) {
        const newLoad = parseLoad(inputText);

        if (newLoad === null) {
            Alert.alert('Erro', `"${inputText}" não é uma carga válida`);
            return;
        }

        try {
            await exerciseEditLoad(exerciseName, newLoad);
            setLoad(newLoad);
            setModalOpen(false);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar a carga');
            console.error(error);
        }
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

            {isLoading ? (
                <Loading />
            ) : (
                <View flex={1} w='100%' px={6} pt={6}>
                    <SerieHeaderCard
                        series={repetitions.length}
                        onAddSerie={handleAddSerie}
                        onRemoveSerie={handleRemoveSerie}
                    />

                    <FlatList
                        data={repetitions}
                        keyExtractor={(_, index) => String(index)}
                        renderItem={({ item, index }) => (
                            <SerieBodyCard
                                serie={`${index + 1}ª série`}
                                onAddRepetition={() => handleChangeRepetitions(index, 1)}
                                onRemoveRepetition={() => handleChangeRepetitions(index, -1)}
                                repetitions={item}
                            />
                        )}
                        ListEmptyComponent={
                            <Text mt={10} textAlign='center' color='white' fontSize={24} fontFamily={'Poppins_600SemiBold'} allowFontScaling={false}>
                                Nenhuma série cadastrada
                            </Text>
                        }
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                    />

                    <View pt={4} style={{ paddingBottom: insets.bottom + 24 }}>
                        <ExerciseLoadCard load={load} onPressEdit={() => setModalOpen(true)} />
                    </View>
                </View>
            )}

            <InputPopup
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initialText={formatLoad(load)}
                title='Carga'
                keyboardType='decimal-pad'
            />
        </View>
    );
}
