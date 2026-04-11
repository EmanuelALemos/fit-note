import { StatusBar } from 'react-native';

import { useFonts, Poppins_600SemiBold } from '@expo-google-fonts/poppins'

import { NativeBaseProvider } from 'native-base';

import { Loading } from '@components/Loading';
import { Routes } from '@routes/index';

export default function App() {
  const [fonstLoaded] = useFonts({ Poppins_600SemiBold })

  return (
      <NativeBaseProvider>
        <StatusBar barStyle="light-content" backgroundColor='transparent' translucent />
        {fonstLoaded ? <Routes /> : <Loading />}
      </NativeBaseProvider>
  );
}
