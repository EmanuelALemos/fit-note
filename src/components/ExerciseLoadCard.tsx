import { View, Text } from "native-base";
import { TouchableOpacity } from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import { formatLoad } from "@utils/load";

interface ExerciseLoadCardProps {
    onPressEdit?: () => void
    load: number;
}

export function ExerciseLoadCard({ load, onPressEdit }: ExerciseLoadCardProps) {
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
            
            <Text
                color='white'
                fontSize={20}
                fontFamily={'Poppins_600SemiBold'}
                allowFontScaling={false} 
            >
                {formatLoad(load)} KG
            </Text>
            <View flexDirection='row' justifyContent='space-between'>
                <TouchableOpacity onPress={onPressEdit}>
                    <MaterialIcons name='edit' size={32} color='#D9F99D' />
                </TouchableOpacity>
            </View>
        </View>
    )
}