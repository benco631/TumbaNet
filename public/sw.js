self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.message,
      // אם אין לכם עדיין אייקונים, זה יעבוד גם בלי, אבל כדאי להוסיף תמונה קטנה של האפליקציה בהמשך
      icon: '/icon-192.png', 
      badge: '/icon-192.png',
      vibrate: [100, 50, 100], // הרטט בטלפון
      data: {
        url: data.targetUrl || '/' // לאן להעביר כשלוחצים על ההתראה
      }
    };

    // מקפיץ את ההתראה המובנית של מערכת ההפעלה
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