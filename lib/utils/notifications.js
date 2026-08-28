// Register service worker for push notifications
export function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      console.log('SW registered:', reg.scope)
    } catch (err) {
      console.error('SW registration failed:', err)
    }
  })
}

// Check if notification permission is granted
export function isNotificationGranted() {
  return typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission === 'granted'
    : false
}

// Send a local notification (for testing)
export function sendLocalNotification(title, body, url = '/') {
  if (!isNotificationGranted()) return

  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: { url },
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, options)
    })
  } else {
    new Notification(title, options)
  }
}
