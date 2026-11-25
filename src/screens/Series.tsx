import React, { useCallback, useState } from "react";

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

import { useDatabase } from "@database/DatabaseProvider";

import { SeriesScreenProps } from "@routes/routeTypes";
import { formatLoad, parseLoad } from "@utils/load";

export function Series({ navigation, route }: SeriesScreenProps) {

    const { exerciseId, exerciseName } = route.params;

    const insets = useSafeAreaInsets();
    const { repository } = useDatabase();

    const [exercise, setExercise] = useState(() => repository.getExercise(exerciseId));
    const [modalOpen, setModalOpen] = useState(false);

    function refresh() {
        try {
            setExercise(repository.getExercise(exerciseId));
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar o exercício');
            console.error(error);
        }
    }

    // A gravação é síncrona: quando termina, a tela já pode reler o que ficou salvo.
    function write(save: () => void, errorMessage: string): boolean {
        try {
            save();
            return true;
        } catch (error) {
            Alert.alert('Erro', errorMessage);
            console.log(error);
            return false;
        } finally {
            refresh();
        }
    }

    function handleAddSerie() {
        write(() => repository.addSet(exerciseId), 'Não foi possível adicionar a série');
    }

    function handleRemoveSerie() {
        write(() => repository.removeLastSet(exerciseId), 'Não foi possível remover a série');
    }

    function handleChangeRepetitions(setNumber: number, delta: number) {
        write(
            () => repository.changeRepetitions(exerciseId, setNumber, delta),
            'Não foi possível alterar as repetições'
        );
    }

    async function handleSave(inputText: string) {
        const newLoad = parseLoad(inputText);

        if (newLoad === null) {
            Alert.alert('Erro', `"${inputText}" não é uma carga válida`);
            return;
        }

        if (write(() => repository.setLoad(exerciseId, newLoad), 'Não foi possível salvar a carga')) {
            setModalOpen(false);
        }
    }

    useFocusEffect(useCallback(() => {
        refresh();
    }, []));

    return (
        <View bg='#404040' flex={1} alignItems='center'>
            <Image source={BackgroundImage} alt='Background' position='absolute' top={0} left={0} right={0} bottom={0} />

            <Header
                title={exerciseName.toUpperCase()}
                onBackPress={() => navigation.goBack()}
            />

            <View flex={1} w='100%' px={6} pt={6}>
                <SerieHeaderCard
                    series={exercise.repetitions.length}
                    onAddSerie={handleAddSerie}
                    onRemoveSerie={handleRemoveSerie}
                />

                <FlatList
                    data={exercise.repetitions}
                    keyExtractor={(_, index) => String(index)}
                    renderItem={({ item, index }) => (
                        <SerieBodyCard
                            serie={`${index + 1}ª série`}
                            onAddRepetition={() => handleChangeRepetitions(index + 1, 1)}
                            onRemoveRepetition={() => handleChangeRepetitions(index + 1, -1)}
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
                    <ExerciseLoadCard load={exercise.loadKg} onPressEdit={() => setModalOpen(true)} />
                </View>
            </View>

            <InputPopup
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initialText={formatLoad(exercise.loadKg)}
                title='Carga'
                keyboardType='decimal-pad'
            />
        </View>
    );
}
