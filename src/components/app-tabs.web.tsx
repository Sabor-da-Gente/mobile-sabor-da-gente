import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Paleta } from '@/constants/paleta';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type PressableRef = ComponentProps<typeof Pressable>['ref'];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%', paddingBottom: 84 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Início</TabButton>
          </TabTrigger>
          <TabTrigger name="perfil" href="/perfil" asChild>
            <TabButton>Perfil</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} ref={ref as unknown as PressableRef} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButton, isFocused && styles.tabButtonSelected]}>
        <Text style={[styles.tabText, isFocused && styles.tabTextSelected]}>{children}</Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.brandText}>Sabor da Gente 🍕</Text>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  brandText: {
    marginRight: 'auto',
    fontWeight: 'bold',
    color: Paleta.primaria,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  tabButtonSelected: {
    backgroundColor: Paleta.destaqueSuave,
  },
  tabText: {
    fontSize: 14,
    color: Paleta.textoSuave,
  },
  tabTextSelected: {
    color: Paleta.primaria,
    fontWeight: 'bold',
  },
});
