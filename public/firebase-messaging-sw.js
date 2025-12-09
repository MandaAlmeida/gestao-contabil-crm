/* eslint-disable no-undef */
// Service Worker para Firebase Cloud Messaging

importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js"
);

// Configuração do Firebase (será preenchida dinamicamente)
// NOTA: Essas variáveis devem estar sincronizadas com seu .env
const firebaseConfig = {
  apiKey: "AIzaSyCss6_-53vfUp8uhoPVbIlvLATbSj5aEt8",
  authDomain: "goldtechsistemas-c2168.firebaseapp.com",
  projectId: "goldtechsistemas-c2168",
  storageBucket: "goldtechsistemas-c2168.firebasestorage.app",
  messagingSenderId: "684270507038",
  appId: "1:684270507038:web:de28f467a6d01ff2b4ca0f",
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handler para notificações em background
  messaging.onBackgroundMessage((payload) => {
    console.log(
      "[firebase-messaging-sw.js] Received background message ",
      payload
    );

    const notificationTitle = payload.notification?.title || "Nova Notificação";
    const notificationOptions = {
      body: payload.notification?.body || "Você tem uma nova notificação",
      icon: "/logo.png",
      badge: "/favicon.ico",
      tag: payload.data?.tag || "default",
      data: {
        url: payload.data?.url || "/",
        ...payload.data,
      },
      requireInteraction: false,
      vibrate: [200, 100, 200],
    };

    return self.registration.showNotification(
      notificationTitle,
      notificationOptions
    );
  });

  // Handler para clique nas notificações
  self.addEventListener("notificationclick", (event) => {
    console.log(
      "[firebase-messaging-sw.js] Notification click received.",
      event
    );

    event.notification.close();

    // Abrir a URL especificada ou a raiz da aplicação
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Verificar se já existe uma janela aberta
          for (const client of clientList) {
            if (
              client.url.includes(self.location.origin) &&
              "focus" in client
            ) {
              // Navegar para a URL e focar na janela existente
              return client.focus().then((client) => {
                if ("navigate" in client) {
                  return client.navigate(urlToOpen);
                }
              });
            }
          }
          // Se não houver janela aberta, abrir uma nova
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  });
} catch (error) {
  console.error(
    "[firebase-messaging-sw.js] Error initializing Firebase:",
    error
  );
}
