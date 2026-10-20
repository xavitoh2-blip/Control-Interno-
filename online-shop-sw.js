/* Online Shop · soporte de notificaciones en la app web.
   Para push en segundo plano hace falta registrar una suscripción y un servidor Web Push.
*/
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    if(clients.length){return clients[0].focus();}
    return self.clients.openWindow('./');
  }));
});
