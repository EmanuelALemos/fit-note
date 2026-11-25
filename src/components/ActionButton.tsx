import { Text } from 'native-base';
import { TouchableOpacity } from 'react-native';

interface ActionButtonProps {
    title: string;
    onPress: () => void;
}

export function ActionButton({ title, onPress }: ActionButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole='button'
            style={{
                height: 60,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: '#D9F99D',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text color='#1A1A1A' fontSize={18} numberOfLines={1} fontFamily={'Poppins_600SemiBold'} allowFontScaling={false}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}
