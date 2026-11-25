import { Modal, Text, View } from 'native-base';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface CardMenuOption {
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    onPress: () => void;
}

interface CardMenuProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    options: CardMenuOption[];
}

export function CardMenu({ isOpen, onClose, title, options }: CardMenuProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size='lg'>
            <Modal.Content bg='#525252' maxWidth='400px' borderRadius='20px'>
                <Modal.CloseButton />
                <Modal.Header bg='#525252'>
                    <Text
                        fontSize='lg'
                        color='white'
                        mr={8}
                        numberOfLines={1}
                        fontFamily={'Poppins_600SemiBold'}
                        allowFontScaling={false}
                    >
                        {title}
                    </Text>
                </Modal.Header>

                <Modal.Body>
                    {options.map(option => (
                        <TouchableOpacity
                            key={option.label}
                            accessibilityRole='button'
                            onPress={() => {
                                onClose();
                                option.onPress();
                            }}
                        >
                            <View flexDirection='row' alignItems='center' py={3}>
                                <MaterialIcons name={option.icon} size={28} color='#D9F99D' />
                                <Text
                                    color='white'
                                    fontSize={18}
                                    ml={4}
                                    fontFamily={'Poppins_600SemiBold'}
                                    allowFontScaling={false}
                                >
                                    {option.label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </Modal.Body>
            </Modal.Content>
        </Modal>
    );
}
