import * as React from "react";

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './routeTypes';

import { Training } from "@screens/Training";
import { Exercise } from "@screens/Exercise";
import { Series } from "@screens/Series";
import { Summary } from "@screens/Summary";
import { History } from "@screens/History";

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

            <Screen 
                name = 'history'
                component={History}
            />

            <Screen 
                name = 'summary'
                component={Summary}
            />
        </Navigator>
    )
}