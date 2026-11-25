import React from "react";
import { View, Text } from "native-base";
import { TouchableOpacity } from "react-native";
import { AntDesign } from "@expo/vector-icons";

interface SerieBodyCardProps {
  serie: string;
  onAddRepetition: () => void;
  onRemoveRepetition: () => void;
  repetitions: number;
}

export function SerieBodyCard({
  serie,
  onAddRepetition,
  onRemoveRepetition,
  repetitions,
}: SerieBodyCardProps) {
  return (
    <View
      flexDirection="row"
      bg="#525252"
      width="100%" // Ocupa 100% da largura da FlatList
      padding={4}
      borderRadius={14}
      alignItems="center"
      justifyContent="space-between"
      marginBottom={4} // Adiciona espaço entre os cards
    >
      {/* Série - Lado esquerdo */}
      <Text
        fontFamily={"Poppins_600SemiBold"}
        fontSize={24}
        color="white"
        flex={2}
        textAlign="left" 
        allowFontScaling={false} 
      >
        {serie}
      </Text>

      {/* Texto "repetições" - centralizado */}
      <Text
        fontFamily={"Poppins_600SemiBold"}
        fontSize={18}
        color="white"
        textAlign="center"
        flex={2}
        numberOfLines={1}
        allowFontScaling={false} 
      >
        repetições
      </Text>

      {/* Controles - lado direito */}
      <View flexDirection="row" alignItems="center" flex={2} justifyContent="flex-end">
        {/* Botão de remover repetição */}
        <TouchableOpacity onPress={onRemoveRepetition} disabled={repetitions <= 0}>
          <AntDesign
            name="minussquare"
            size={32}
            color={repetitions <= 0 ? "#404040" : "#D9F99D"}
          />
        </TouchableOpacity>

        {/* Número de repetições */}
        <Text
          fontFamily={"Poppins_600SemiBold"}
          fontSize={24}
          color="white"
          textAlign="center"
          style={{ marginHorizontal: 10 }}
          allowFontScaling={false} 
        >
          {repetitions}
        </Text>

        {/* Botão de adicionar repetição */}
        <TouchableOpacity onPress={onAddRepetition}>
          <AntDesign name="plussquare" size={32} color="#D9F99D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
