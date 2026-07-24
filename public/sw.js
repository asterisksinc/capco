self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "New Notification", body: event.data ? event.data.text() : "" };
  }
  
  // Notify client windows
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'NEW_NOTIFICATION', payload }));
  });

  event.waitUntil(
    self.registration.showNotification(payload.title || "CAPCO", {
      body: payload.body || "You have a new notification.",
      data: payload.data || {},
      icon: "/logo (2).svg"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const payloadData = event.notification.data || {};
  let targetUrl = payloadData.url || "/";
  // Attempt to construct a URL based on notification data if generic url is missing
  if (!payloadData.url && payloadData.related_entity_id && payloadData.type) {
    if (payloadData.type.includes("WorkOrder")) {
       targetUrl = `/admin/workorders/${payloadData.related_entity_id}`;
    } else if (payloadData.type.includes("ProductOrder")) {
       targetUrl = `/admin/productorders/${payloadData.related_entity_id}`;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
