import React from "react"

import { View, Text } from "native-base"
import { TouchableOpacity } from "react-native"

import { AntDesign } from "@expo/vector-icons"

interface SerieHeaderCardProps {
    series: number;
    onAddSerie: () => void;
    onRemoveSerie: () => void;
}

export function SerieHeaderCard({ series, onAddSerie, onRemoveSerie }: SerieHeaderCardProps) {
    return (
        <View flexDirection='row' bg='#525252' mb={6} w='100%' h={'20'} borderRadius={14} alignItems='center' justifyContent='space-between' p={4}>
            <Text fontFamily={'Poppins_600SemiBold'} fontSize={24} color='white'  allowFontScaling={false} >
                SÉRIES
            </Text>


            <View flexDirection='row'>
                <TouchableOpacity
                    onPress={onRemoveSerie}
                    disabled={series <= 0}
                >
                    <AntDesign name="minussquare" size={32} color={series <= 0 ? '#404040' : '#D9F99D'} />
                </TouchableOpacity>

                <Text
                    fontFamily={'Poppins_600SemiBold'}
                    fontSize={24}
                    color='white'
                    ml={2}
                    mr={2}
                    allowFontScaling={false} 
                >
                    {series}
                </Text>
                <TouchableOpacity
                    onPress={onAddSerie}
                >
                    <AntDesign name="plussquare" size={32} color='#D9F99D' />
                </TouchableOpacity>
            </View>
        </View>
    )
}