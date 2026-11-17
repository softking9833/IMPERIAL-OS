import type { ComponentProps } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  name,
  focused,
}: {
  name: IconName;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? colors.accentStrong : colors.muted}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accentStrong,
        tabBarStyle: {
          backgroundColor: "#0A0E0C",
          borderTopColor: "rgba(196,163,90,0.25)",
        },
        tabBarActiveTintColor: colors.accentStrong,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="field"
        options={{
          title: "Field",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "map" : "map-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "book" : "book-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: "Perf",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "bar-chart" : "bar-chart-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "person-circle" : "person-circle-outline"}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
