import { addKeyword } from '@builderbot/bot'
import typingEffect from '../../utils/typing-effect.js'

const detailGedungFlow = addKeyword('.detailGedung')
    .addAction(async (ctx, { flowDynamic, provider }) => {
        const uuidMatch = ctx.body.match(/\.detailGedung([a-f0-9-]{36})/i)
        if (!uuidMatch) {
            await flowDynamic('❌ Format salah.')
            return
        }
        
        const uuid = uuidMatch[1]
        console.log('🔍 Gedung UUID:', uuid)
        
        try {
            await typingEffect(ctx, { provider }, {
                 onTyping: async () => {
                    await flowDynamic('⏳ Loading detail...')
                 }
             });
            
            const response = await fetch(`${process.env.DOMAIN_API_URL}/api/gedung/${uuid}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'X-API-Key': process.env.APIKEY_IMARAH_BLACKLIST
                }
            })

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText.substring(0, 200));
                await flowDynamic(`❌ API Error ${response.status}`);
                return;
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                const errorText = await response.text();
                console.error('Not JSON:', errorText.substring(0, 200));
                await flowDynamic('⚠️ Invalid API response');
                return;
            }
            
            const gedung = await response.json()
            
            const mapsUrl = `https://www.google.com/maps?q=${gedung.lat},${gedung.long}`
            const botNumber = (ctx.from?.me || process.env.WA_BOT_NUMBER).replace('@s.whatsapp.net', '')
            
            let message = `🏢 *${gedung.nama_gedung}*\n\n`
            message += `🏠 *${gedung.total_units}* Unit\n`
            message += `📍 *${gedung.alamat}*\n`
            message += `🗺️ [Maps](${mapsUrl})\n\n`
            message += `━━━━━━━━━━━━━━━━\n📋 *DAFTAR UNIT*\n━━━━━━━━━━━━━━━━\n\n`
            
            gedung.units.forEach((unit, i) => {
                const deepLinkText = `.detailUnit${unit.uuid}`
                const waMeLink = `https://wa.me/+${botNumber}?text=${encodeURIComponent(deepLinkText)}`
                
                message += `${i+1}. *Lt ${unit.lantai} (${unit.unit_number})*\n`
                message += `   📝 ${unit.deskripsi}\n`
                message += `   ⚠️ ${unit.alasan_blacklist}\n`
                message += `   🔗 [Detail Unit](${waMeLink})\n\n`
            })
            
            message += `━━━━━━━━━━━━━━━━`
            
            if (gedung.primary_image) {
                await typingEffect(ctx, { provider }, {
                 onTyping: async () => {
                    await flowDynamic([{
                        body: message,
                        media: gedung.primary_image,
                        delay: 500
                     }])
                 }
             });
               
            } else {
                await typingEffect(ctx, { provider }, {
                    duration: 1000,
                    onTyping: async () => {
                     await flowDynamic([{
                         body: message,
                         delay: 500
                     }])
                    }
                });
            }
            
        } catch (error) {
            console.error('Error:', error)
            await flowDynamic('⚠️ Gagal load detail')
        }
    })

export default detailGedungFlow
