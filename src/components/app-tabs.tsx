import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Paleta } from '@/constants/paleta';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Paleta.superficie}
      shadowColor={Paleta.borda}
      tintColor={Paleta.primaria}
      indicatorColor={Paleta.destaqueSuave}
      rippleColor={Paleta.destaqueSuave}
      iconColor={{ default: Paleta.textoSuave, selected: Paleta.primaria }}
      labelStyle={{
        default: { color: Paleta.textoSuave },
        selected: { color: Paleta.primaria, fontWeight: 'bold' },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
