import React, { useEffect, useState } from 'react';
import { KeyboardTypeOptions } from 'react-native';
import { Modal, Button, Input, View, Text, FormControl } from 'native-base';

import { AntDesign } from '@expo/vector-icons';

interface InputPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (inputText: string) => Promise<void>; // Quem chama fecha o modal quando der certo
    initialText?: string | undefined; // Optional prop for editing
    title: string;
    hint?: string;
    placeholder?: string;
    isEditing?: boolean;
    keyboardType?: KeyboardTypeOptions;
}

export function InputPopup({ isOpen, onClose, onSave, initialText, title, hint, placeholder, isEditing = !!initialText, keyboardType }: InputPopupProps) {
    const [inputText, setInputText] = useState(initialText || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setInputText(initialText || '');
        }
    }, [initialText, isOpen]);

    const handleSave = async () => {
        if (isSaving) {
            return;
        }

        try {
            setIsSaving(true);
            await onSave(inputText);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            {/* Estilizar a área fora do modal */}
            <Modal.Content bg="#525252" maxWidth="400px" borderRadius="20px">
                <Modal.CloseButton />
                <Modal.Header bg='#525252'>
                    <Text fontSize="lg" color="white" fontFamily={'Poppins_600SemiBold'} allowFontScaling={false} >
                        {isEditing ? `Editar ${title}` : `Novo ${title}`}
                    </Text>
                </Modal.Header>

                <Modal.Body>
                    <FormControl>
                        <FormControl.Label>
                            <Text color="white" fontFamily={'Poppins_600SemiBold'} allowFontScaling={false} >{title}</Text>
                        </FormControl.Label>
                        <Input
                            variant="filled"
                            placeholder={placeholder ?? `Digite o ${title}`}
                            value={inputText}
                            keyboardType={keyboardType}
                            onChangeText={(text) => setInputText(text)}
                            bg="#404040"
                            color="white"
                            borderColor="transparent"
                            _focus={{ borderColor: '#FFF' }}
                            fontFamily={'Poppins_600SemiBold'}
                        />
                    </FormControl>
                    {hint &&
                        <Text mt={3} color="#D4D4D4" fontFamily={'Poppins_600SemiBold'} allowFontScaling={false}>{hint}</Text>
                    }
                </Modal.Body>

                <Modal.Footer bg='#525252'>
                    <Button.Group space={2} flex={1}>
                        <Button bg='#525252' onPress={onClose} flex={1}>
                            <View flexDirection='row'>
                                <Text
                                    fontFamily={'Poppins_600SemiBold'}
                                    color='white'
                                    mr={2}
                                    allowFontScaling={false}
                                >
                                    Cancelar
                                </Text>
                                <AntDesign name='closesquare' color='#D9F99D' size={20} />
                            </View>
                        </Button>
                        <Button onPress={handleSave} isDisabled={isSaving} bg="#525252" flex={1}>
                            <View flexDirection='row' alignItems={'center'}>
                                <Text fontFamily={'Poppins_600SemiBold'} color='white' mr={2}  allowFontScaling={false}>
                                    {isEditing ? 'Salvar Alterações' : `Criar ${title}`}
                                </Text>
                                <AntDesign name='checksquare' color='#D9F99D' size={20} />
                            </View>
                        </Button>
                    </Button.Group>
                </Modal.Footer>
            </Modal.Content>
        </Modal>
    );
}
