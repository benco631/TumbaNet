self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.message,
      icon: '/icon.png',   // האייקון הראשי המעוצב שלך
      badge: '/badge.png', // האייקון השקוף לשורת הסטטוס
      vibrate: [200, 100, 200],
      data: {
        url: data.targetUrl || '/' 
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// מאזין ללחיצה על ההתראה כדי לפתוח את האפליקציה
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});