import { View, Text } from 'native-base'
import { TouchableOpacity } from 'react-native'

import { MaterialIcons, Foundation } from '@expo/vector-icons'

interface CardProps {
    name: string;
    onPressTrash?: () => void
    onPressEdit?: () => void
    onPressNavigate?: () => void
    canEdit?: boolean;
}

export function Card({ name, onPressTrash, onPressEdit, onPressNavigate, canEdit = true }: CardProps) {
    return (
        <TouchableOpacity
            onPress={onPressNavigate}
        >
            <View flexDirection='row' bg='#525252' mb={6} w='100%' h={'20'} borderRadius={14} alignItems='center' justifyContent='space-between' p={4}>
                <Text
                    color='white'
                    fontSize={20}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    flex={1}
                    mr={4}
                    fontFamily={'Poppins_600SemiBold'}
                >
                    {name}
                </Text>
                <View flexDirection='row' justifyContent='space-between'>
                    {canEdit ?
                        <TouchableOpacity onPress={onPressEdit}>
                            <MaterialIcons style={{ marginRight: 16 }} name='edit' size={32} color='#D9F99D' />
                        </TouchableOpacity>
                        :
                        null
                    }
                    <TouchableOpacity onPress={onPressTrash}>
                        <Foundation name='trash' size={32} color='#D9F99D' />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    )
}