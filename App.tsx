import { StatusBar } from 'react-native';

import { useFonts, Poppins_600SemiBold } from '@expo-google-fonts/poppins'

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { NativeBaseProvider } from 'native-base';

import { DatabaseProvider } from '@database/DatabaseProvider';
import { Loading } from '@components/Loading';
import { Routes } from '@routes/index';

export default function App() {
  const [fonstLoaded] = useFonts({ Poppins_600SemiBold })

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NativeBaseProvider initialWindowMetrics={initialWindowMetrics}>
        <StatusBar barStyle="light-content" backgroundColor='transparent' translucent />
        {fonstLoaded ? <DatabaseProvider><Routes /></DatabaseProvider> : <Loading />}
      </NativeBaseProvider>
    </GestureHandlerRootView>
  );
}
