self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event?.data?.json() || {}
  } catch {
    payload = {}
  }

  const title = payload?.notification?.title || payload?.data?.title || 'Ride Update'
  const body = payload?.notification?.body || payload?.data?.body || 'You have a new update.'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/vite.svg'
    })
  )
})
