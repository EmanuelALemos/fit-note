import React from 'react';
import { SafeAreaView } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';

import { AppRoutes } from './app.routes';

export function Routes() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <NavigationContainer>
                <AppRoutes />
            </NavigationContainer>
        </SafeAreaView>
    );
}