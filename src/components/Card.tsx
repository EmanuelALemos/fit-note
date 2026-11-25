import { View, Text } from 'native-base'
import { TouchableOpacity } from 'react-native'

import { MaterialIcons } from '@expo/vector-icons'

interface CardProps {
    name: string;
    details?: string;
    onPressNavigate: () => void;
    onPressMenu: () => void;
    onDrag: () => void;
    isDragging: boolean;
}

export function Card({ name, details, onPressNavigate, onPressMenu, onDrag, isDragging }: CardProps) {
    return (
        <TouchableOpacity onPress={onPressNavigate} disabled={isDragging}>
            <View
                flexDirection='row'
                bg='#525252'
                mb={6}
                w='100%'
                h={'20'}
                borderRadius={14}
                alignItems='center'
                px={2}
                style={{ opacity: isDragging ? 0.8 : 1 }}
            >
                {/* Toque curto não move, para não trocar a ordem sem querer ao rolar a lista */}
                <TouchableOpacity
                    onLongPress={onDrag}
                    delayLongPress={150}
                    disabled={isDragging}
                    accessibilityLabel={`Reordenar ${name}`}
                    style={{ height: '100%', justifyContent: 'center', paddingHorizontal: 4 }}
                >
                    <MaterialIcons name='drag-indicator' size={28} color='#A3A3A3' />
                </TouchableOpacity>

                <View flex={1} mx={2}>
                    <Text
                        color='white'
                        fontSize={20}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        fontFamily={'Poppins_600SemiBold'}
                    >
                        {name}
                    </Text>
                    {details &&
                        <Text
                            color='#D4D4D4'
                            fontSize={14}
                            numberOfLines={1}
                            fontFamily={'Poppins_600SemiBold'}
                            allowFontScaling={false}
                        >
                            {details}
                        </Text>
                    }
                </View>

                <TouchableOpacity
                    onPress={onPressMenu}
                    disabled={isDragging}
                    accessibilityRole='button'
                    accessibilityLabel={`Opções de ${name}`}
                    style={{ height: '100%', justifyContent: 'center', paddingHorizontal: 8 }}
                >
                    <MaterialIcons name='more-horiz' size={32} color='#D9F99D' />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    )
}
