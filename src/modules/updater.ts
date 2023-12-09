import {
  checkUpdate,
  installUpdate,
  type UpdateManifest,
  type UpdateStatus,
} from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { get, writable } from 'svelte/store'

interface WhatsUpdate {
  refreshing: boolean
  msg?: string
  error?: string
  status?: UpdateStatus
  manifest?: UpdateManifest
}

enum UpdateErrors {
  None,
  MalformedManifest = 'The update URL is not providing a valid JSON',
  InvalidSignature = "The update's code signature does not match the pubkey provided",
  KeyID = 'The key ID does not match',
}

export const updateStatus = writable<WhatsUpdate>({ refreshing: false })

export const tryUpdate = async () => {
  updateStatus.set({ refreshing: true })
  try {
    const { shouldUpdate, manifest } = await checkUpdate()

    if (shouldUpdate) {
      const u = get(updateStatus)
      u.msg = 'upgrade is available'
      u.manifest = manifest

      updateStatus.set(u)
      // You could show a dialog asking the user if they want to install the update here.
      console.log(`Installing update ${manifest?.version}, ${manifest?.date}, ${manifest?.body}`)

      u.msg = 'attempting install'
      updateStatus.set(u)
      // Install the update. This will also restart the app on Windows!
      await installUpdate()

      u.msg = 'attempting relaunch'
      updateStatus.set(u)
      // On macOS and Linux you will need to restart the app manually.
      // You could use this step to display another confirmation dialog.
      await relaunch()
      u.refreshing = false
      updateStatus.set(u)
    }
  } catch (e) {
    updateStatus.update((u) => {
      u.error = e
      u.msg = parseErrorString(e).toString()
      u.refreshing = false
      return u
    })
  }
}

export const parseErrorString = (msg: string): UpdateErrors => {
  let errEnum = UpdateErrors.None
  if (msg.includes('UnexpectedKeyId')) {
    errEnum = UpdateErrors.KeyID
  } else if (msg.includes('missing')) {
    errEnum = UpdateErrors.MalformedManifest
  } else if (msg.includes('InvalidSignature')) {
    errEnum = UpdateErrors.InvalidSignature
  }
  return errEnum
}