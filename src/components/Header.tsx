import React from 'react';
import { View, Text, Image } from 'native-base';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import Add from '@assets/MAIS.png';

interface HeaderProps {
    onBackPress?: () => void;
    onAddPress?: () => void;
    title?: string;
    subtitle?: string;
    status?: string;
}

export function Header({ onBackPress, onAddPress, title, subtitle, status }: HeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View flexDirection={'row'} w={'100%'} px={4} pb={4} style={{ paddingTop: insets.top + 24 }}>
            <View style={{ width: 44 }}>
                {onBackPress && (
                    <TouchableOpacity onPress={onBackPress}>
                        <AntDesign name='arrowleft' size={44} color='white' />
                    </TouchableOpacity>
                )}
            </View>

            <View flex={1} alignItems={'center'} px={2}>
                {title && (
                    <Text
                        color='white'
                        fontSize={32}
                        fontFamily={'Poppins_600SemiBold'}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.6}
                        ellipsizeMode="tail"
                        allowFontScaling={false}
                        textAlign={'center'}
                    >
                        {title}
                    </Text>
                )}

                {subtitle && (
                    <Text
                        color='white'
                        fontFamily={'Poppins_600SemiBold'}
                        fontSize={24}
                        numberOfLines={1}
                        allowFontScaling={false}
                        textAlign={'center'}
                    >
                        {subtitle}
                    </Text>
                )}

                {status && (
                    <Text
                        color='#D9F99D'
                        fontFamily={'Poppins_600SemiBold'}
                        fontSize={14}
                        numberOfLines={1}
                        allowFontScaling={false}
                        textAlign={'center'}
                    >
                        {status}
                    </Text>
                )}

                {onAddPress && (
                    <TouchableOpacity onPress={onAddPress}>
                        <Image source={Add} alt='add' style={{ width: 52, height: 52 }} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ width: 44 }} />
        </View>
    );
}
