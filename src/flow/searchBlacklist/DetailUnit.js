import { addKeyword } from '@builderbot/bot'
import typingEffect from '../../utils/typing-effect.js'

// Rate limiting: 15 detik per user
const userDetailUnitTimestamps = {}
const RATE_LIMIT_SECONDS = 15

const detailUnitFlow = addKeyword('.detailUnit')
    .addAction(async (ctx, { flowDynamic, provider }) => {
        const userId = ctx.from
        const currentTime = Date.now()
        const rateLimitMs = RATE_LIMIT_SECONDS * 1000
        
        // Validasi rate limit
        if (userDetailUnitTimestamps[userId]) {
            const timeDiff = currentTime - userDetailUnitTimestamps[userId]

            if (timeDiff < rateLimitMs) {
                const remainingSeconds = Math.ceil((rateLimitMs - timeDiff) / 1000)
                console.log('🚫 RATE LIMITED! Remaining:', remainingSeconds, 'seconds')
                try {
                    await flowDynamic(`⏱️ Mohon tunggu *${remainingSeconds} detik* lagi.`)
                } catch (err) {
                    console.error('flowDynamic error:', err)
                }
                return
            }
        }

        
        // Update timestamp user
        userDetailUnitTimestamps[userId] = currentTime

        const uuidMatch = ctx.body.match(/\.detailUnit([a-f0-9-]{36})/i)
        if (!uuidMatch) {
            await typingEffect(ctx, { provider }, 200);
            await flowDynamic('❌ Format salah.')
            return
        }
        
        const uuid = uuidMatch[1]
        console.log('🔍 Unit UUID:', uuid)
        
        try {
            await typingEffect(ctx, { provider }, {
                onTyping: async () => {
                    await flowDynamic('⏳ Loading unit detail...')
                }
            });

            console.log('🔍 Request Details:')
            console.log('  URL:', `${process.env.DOMAIN_API_URL}/api/unit/${uuid}`)
            console.log('  API Key:', process.env.APIKEY_IMARAH_BLACKLIST ? '✓ Loaded' : '✗ Missing')
            
            const response = await fetch(`${process.env.DOMAIN_API_URL}/api/unit/${uuid}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'X-API-Key': process.env.APIKEY_IMARAH_BLACKLIST
                }
            })
            
            const unit = await response.json()
            
            let message = `🏠 *Unit Lt ${unit.lantai} (${unit.unit_number})*\n\n`
            message += `📍 *${unit.gedung_nama}*\n`
            message += `📝 ${unit.deskripsi}\n`
            message += `⚠️ *${unit.alasan_blacklist}*\n\n`
            message += `👤 *Pemilik:* ${unit.pemilik}\n`
            message += `👤 *Agen:* ${unit.agen}\n`
            message += `\n🏷️ *Status:* ${unit.listing_type?.toUpperCase() || 'UNKNOWN'}\n`
            message += `\n*Terima kasih telah melihat detail unit*`
            
            // **SAMA PERSIS SEPERTI GEDUNG** - 1 primary image atau text only
            const primaryImage = unit.images?.[0]  // Gambar pertama
            
            if (primaryImage) {
                await typingEffect(ctx, { provider }, {
                    onTyping: async () => {
                        await flowDynamic([{
                            body: message,
                            media: primaryImage,
                            delay: 500
                        }])
                    }
                });
                
            } else {
                await typingEffect(ctx, { provider }, {
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
            await typingEffect(ctx, { provider }, {
                    onTyping: async () => {
                        await flowDynamic('⚠️ Gagal load unit detail')
                    }
                });
        }
    })

export default detailUnitFlow
