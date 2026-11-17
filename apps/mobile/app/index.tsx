import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { api, getToken, setToken } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setAuthed(false);
        setReady(true);
        return;
      }
      try {
        await api.me();
        setAuthed(true);
      } catch {
        await setToken(null);
        setAuthed(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={authed ? "/(tabs)/home" : "/login"} />;
}
