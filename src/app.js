import {} from 'dotenv/config'
import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot'
import { PostgreSQLAdapter as Database } from '@builderbot/database-postgres'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

// Bisnis Logic
import {
    handlingLocationFlow,
    detailGedungFlow,
    detailUnitFlow
} from './flow/index.js'

const PORT = process.env.PORT ?? 3008

// Flow minimal hanya untuk memastikan bot aktif
const welcomeFlow = addKeyword(['hi', 'hello', 'hola'])
    .addAnswer('Bot is active')

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, handlingLocationFlow, detailGedungFlow, detailUnitFlow])
    
    const adapterProvider = createProvider(Provider, {
          timeRelease: 10800000,        // Cleans up data every 3 hours (in milliseconds)
          experimentalStore: true,      // Significantly reduces resource consumption
          version: [2, 3000, 1027934701]
        });
    
    const adapterDB = new Database({
        host: process.env.POSTGRES_DB_HOST,
        user: process.env.POSTGRES_DB_USER,
        database: process.env.POSTGRES_DB_NAME,
        password: process.env.POSTGRES_DB_PASSWORD,
        port: +process.env.POSTGRES_DB_PORT
    })

    const { httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    httpServer(+PORT)
}

main()
