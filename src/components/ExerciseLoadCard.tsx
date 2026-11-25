import { View, Text } from "native-base";
import { TouchableOpacity } from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import { formatDelta } from "@utils/format";
import { formatLoad } from "@utils/load";

interface ExerciseLoadCardProps {
    onPressEdit?: () => void
    load: number;
    lastLoad?: number;
}

export function ExerciseLoadCard({ load, lastLoad, onPressEdit }: ExerciseLoadCardProps) {
    return (
        <View flexDirection='row' bg='#525252' w='100%' h={'20'} borderRadius={14} alignItems='center' justifyContent='space-between' p={4}>
            <Text
                color='white'
                fontSize={20}
                fontFamily={'Poppins_600SemiBold'}
                allowFontScaling={false} 
            >
                CARGA
            </Text>
            
            <View alignItems='center'>
                <Text
                    color='white'
                    fontSize={20}
                    lineHeight={28}
                    fontFamily={'Poppins_600SemiBold'}
                    allowFontScaling={false}
                >
                    {formatLoad(load)} KG
                </Text>
                {lastLoad !== undefined &&
                    <Text
                        color='#D9F99D'
                        fontSize={12}
                        lineHeight={16}
                        fontFamily={'Poppins_600SemiBold'}
                        allowFontScaling={false}
                    >
                        {`última: ${formatLoad(lastLoad)} kg${load === lastLoad ? '' : ` · ${formatDelta(load - lastLoad)}`}`}
                    </Text>
                }
            </View>
            <View flexDirection='row' justifyContent='space-between'>
                <TouchableOpacity onPress={onPressEdit}>
                    <MaterialIcons name='edit' size={32} color='#D9F99D' />
                </TouchableOpacity>
            </View>
        </View>
    )
}