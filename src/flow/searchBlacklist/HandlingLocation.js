import { addKeyword, EVENTS } from '@builderbot/bot'
import { reset, start, stop } from '../../utils/idle-custom.js'

// Object untuk menyimpan timestamp terakhir user mengirim location
const userLocationTimestamps = {}

const handlingLocationFlow = addKeyword(EVENTS.LOCATION)
    .addAction(async (ctx, { state, endFlow, gotoFlow }) => {
        start(ctx, gotoFlow, 120000) // start idle 2menit
        const userId = ctx.from
        const currentTime = Date.now()
        const oneMinute = 60 * 1000 // 60 detik dalam milidetik
        
        // Cek apakah user sudah pernah kirim location sebelumnya
        if (userLocationTimestamps[userId]) {
            const timeDiff = currentTime - userLocationTimestamps[userId]
            
            // Jika belum lewat 1 menit
            if (timeDiff < oneMinute) {
                const remainingSeconds = Math.ceil((oneMinute - timeDiff) / 1000)
                return endFlow(`⏱️ Mohon tunggu *${remainingSeconds} detik* lagi sebelum mengirim lokasi kembali.`)
            }
        }
        
        // Update timestamp user
        userLocationTimestamps[userId] = currentTime

        // Simpan koordinat lokasi ke state
        const lat = ctx.message.locationMessage.degreesLatitude
        const long = ctx.message.locationMessage.degreesLongitude
        
        await state.update({ 
            lat: lat, 
            long: long 
        })
    })
    .addAnswer(
        '📍 Lokasi diterima!\n\nBerapa meter radius pencarian yang Anda inginkan?\n\nContoh: 500\n\nKetik *exit* untuk membatalkan',
        { capture: true },
        async (ctx, { state, fallBack, endFlow, gotoFlow }) => {
            reset(ctx, gotoFlow, 120000)
            const input = ctx.body.trim().toLowerCase()
            
            // Cek jika user ingin exit
            if (input === 'exit' || input === 'batal' || input === 'cancel') {
                stop(ctx)
                return endFlow('❌ Pencarian dibatalkan.')
            }
            
            const radius = parseInt(ctx.body)
            
            // Validasi angka & radius lebih dari 1km
            if (isNaN(radius) || radius <= 0 || radius > 1000) {
                reset(ctx, gotoFlow, 120000)
                return fallBack('❌ Mohon masukkan angka yang valid antara 1-1000m (contoh: 500)\n\nAtau ketik *exit* untuk membatalkan')
            }
            
            // Simpan radius ke state
            await state.update({ radius: radius })
        }
    )
    .addAction(async (ctx, { flowDynamic, state, provider }) => {
        try {
            stop(ctx) // stop idle
            const lat = state.get('lat')
            const long = state.get('long')
            const radius = state.get('radius')
            
            // Debug: log data yang dikirim
            console.log('Sending to API:', { lat, long, radius, })
            
            // Kirim pesan awal dan simpan key-nya
            const sentMsg = await provider.vendor.sendMessage(
                ctx.key.remoteJid, 
                { text: '🔍 Mencari gedung terdekat...' }
            )
            
            // Fetch ke API
            const response = await fetch(`${process.env.DOMAIN_API_URL}/api/gedung/nearby`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.APIKEY_IMARAH_BLACKLIST 
                },
                body: JSON.stringify({ 
                    lat: parseFloat(lat), 
                    long: parseFloat(long), 
                    radius: parseInt(radius) 
                })
            })
            
            const data = await response.json()
            
            // Buat pesan hasil
            let fullMessage = ''
            if (data.success && data.count > 0) {
                fullMessage = `✅ Ditemukan *${data.count}* gedung dalam radius ${data.radius}m\n\n`
                
                data.results.forEach((gedung, index) => {
                    // UUID LENGKAP dari response Anda
                    const uuidLengkap = gedung.uuid 
                   const botNumber = (ctx.from?.me || process.env.WA_BOT_NUMBER).replace('@s.whatsapp.net', '')
                    const deepLinkText = `.detailGedung${uuidLengkap}`
                    const waMeLink = `https://wa.me/+${botNumber}?text=${encodeURIComponent(deepLinkText)}`

                    fullMessage += `${index + 1}. 🏢 *${gedung.nama_gedung}*\n`
                    fullMessage += `📍 ${gedung.alamat}\n`
                    fullMessage += `📏 Jarak: *${Math.round(gedung.distance)}m* | 🏠 ${gedung.total_units} unit\n`
                    fullMessage += `🔗 [Detail Gedung](${waMeLink})\n`
                    if (index < data.results.length - 1) {
                        fullMessage += `━━━━━━━━━━━━━━━━\n`
                    }
                })

            } else {
                fullMessage = `❌ Tidak ada gedung ditemukan dalam radius ${radius}m dari lokasi Anda.`
            }
            
            // Delay sebelum edit (opsional)
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Edit pesan sebelumnya dengan hasil
            await provider.vendor.sendMessage(
                ctx.key.remoteJid,
                { text: fullMessage, edit: sentMsg.key }
            )
            
            await state.clear()
            
        } catch (error) {
            console.error('Error:', error)
            await flowDynamic('⚠️ Maaf, terjadi kesalahan saat mencari gedung terdekat. Silakan coba lagi.')
        }
    })

export default handlingLocationFlow
