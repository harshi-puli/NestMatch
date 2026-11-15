import { Tabs, TabList, TabSlot } from 'expo-router/ui';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList style={{ display: 'none' }} />
    </Tabs>
  );
}
