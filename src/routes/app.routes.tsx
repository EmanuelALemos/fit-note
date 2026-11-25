import * as React from "react";

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './routeTypes';

import { Training } from "@screens/Training";
import { Exercise } from "@screens/Exercise";
import { Series } from "@screens/Series";

const { Navigator, Screen } = createNativeStackNavigator<RootStackParamList>();

export function AppRoutes() {
    return (
        <Navigator screenOptions={{headerShown: false}}>
            <Screen 
                name = 'training'
                component={Training}
            />

            <Screen 
                name = 'exercise'
                component={Exercise}
            />

            <Screen 
                name = 'series'
                component={Series}
            />
        </Navigator>
    )
}