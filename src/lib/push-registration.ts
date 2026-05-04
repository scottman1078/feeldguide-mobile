import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Foreground display behavior — show banner + sound + alert.
// Notifications.setNotificationHandler must be set before any
// notification arrives, so we set it at module load.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

async function getProjectId(): Promise<string | undefined> {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId ??
    undefined
  )
}

export async function registerExpoPushToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null

  try {
    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync()
      status = req.status
    }
    if (status !== 'granted') return null

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#2AA198',
      })
    }

    const projectId = await getProjectId()
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const token = tokenResp.data
    if (!token) return null

    await supabase
      .from('fg_profiles')
      .update({ expo_push_token: token })
      .eq('id', userId)

    return token
  } catch (err) {
    console.warn('[push] registration failed', err)
    return null
  }
}
