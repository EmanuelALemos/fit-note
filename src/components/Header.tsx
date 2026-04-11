import React from 'react';
import { View, Text, Image } from 'native-base';
import { TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Add from '@assets/MAIS.png';

interface HeaderProps {
    onBackPress: () => void;
    onAddPress?: () => void;
    title?: string;
    subtitle?: string;
}

export function Header({ onBackPress, onAddPress, title, subtitle }: HeaderProps) {
    return (
        <View flexDirection={'row'} justifyContent={'space-between'} mt={100} w={'100%'} px={4}>
            <TouchableOpacity onPress={onBackPress}>
                <AntDesign name='arrowleft' size={44} color='white' />
            </TouchableOpacity>

            <View flex={1} alignItems={'center'} justifyContent={'center'} position={'absolute'} left={0} right={0}>
                <Text
                    color='white'
                    fontSize={32}
                    fontFamily={'Poppins_600SemiBold'}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    allowFontScaling={false}
                    textAlign={'center'}
                    maxW={'70%'}
                >
                    {title}
                </Text>

                {subtitle && (
                    <Text
                        color='white'
                        fontFamily={'Poppins_600SemiBold'}
                        fontSize={24}
                        allowFontScaling={false}
                        textAlign={'center'}
                    >
                        {subtitle}
                    </Text>
                )}

                {onAddPress && (
                    <TouchableOpacity onPress={onAddPress}>
                        <Image source={Add} alt='add' style={{ width: 52, height: 52 }} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
