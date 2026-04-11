import { Image, Text } from 'native-base'
import { TouchableOpacity } from 'react-native'

import Add from '@assets/MAIS.png'

interface ButtonAddProps {
    onPress: () => void;
    title: string;
}

export function ButtonAdd({onPress, title}: ButtonAddProps) {
    return (
        <TouchableOpacity 
            style={{ alignContent: 'center', alignItems: 'center' }}
            onPress={onPress}
        >
            <Image source={Add} alt='Add' />
            <Text color='white' fontSize={28} mt={6} fontFamily={'Poppins_600SemiBold'}  allowFontScaling={false}>{title}</Text>
        </TouchableOpacity>
    )
}