export default async (ctx, { provider }, options = {}) => {
  const { 
    duration = 1500, 
    onTyping = null 
  } = options;
  
  await provider.vendor.readMessages([ctx.key]);
  await provider.vendor.sendPresenceUpdate('composing', ctx.key.remoteJid);
  await new Promise(resolve => setTimeout(resolve, duration));
  
  // Eksekusi callback di sini
  if (onTyping && typeof onTyping === 'function') {
    await onTyping();
  }
  
  await provider.vendor.sendPresenceUpdate('available', ctx.key.remoteJid);
};


// menggunakan custom duration
  //   await typingEffect(ctx, { provider }, {
  //     duration: 1000,
  //     onTyping: async () => {
        
  //       // REST CODE DI sini

  //     }
  // });


// Menggunakan default duration (1500ms)
// await typingEffect(ctx, { provider }, {
//   onTyping: async () => {
//     await flowDynamic([{ body: message, media: primaryImage }]);
//   }
// });

// Menggunakan custom duration
// await typingEffect(ctx, { provider }, {
//       duration: 1000,
//       onTyping: async () => {
//         await provider.vendor.sendMessage(
//           ctx.key.remoteJid,
//           { text: 'pong' },
//           { quoted: ctx }
//         );
//       }
//   });