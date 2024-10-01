const { TwitterApi } = require('twitter-api-v2');
const dotenv = require('dotenv');
const { dolarAPI } = require('./apis.js');
const { format, formatInTimeZone } = require('date-fns-tz');
let lastQuotes = {}; // Inicializa un objeto vacío para almacenar las últimas cotizaciones

// Cargar variables de entorno
dotenv.config();

async function fetchDollarData() {
    try {
        const res = await fetch(dolarAPI);
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error fetching dollar data:', error);
        return null;
    }
}

function getCurrentDateTime() {
    const now = new Date();
    const argentinaDate = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'dd-MM HH:mm');
    const hours = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'HH');
    const dayOfWeek = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'i');

    return {
        dateTimeString: argentinaDate,
        hours: parseInt(hours, 10),
        dayOfWeek: parseInt(dayOfWeek),
    };
}

function formattedTweet(changes, datetime) {
    return `Cambios en Cotizaciones al ${datetime}hs💸:\n` +
        changes.map(item => `⚫${item.nombre}: $${item.venta} (${item.change}%)`).join('\n');
}

// Crear el cliente de Twitter
const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET_KEY,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

async function tweet() {
    const { dateTimeString, hours, dayOfWeek } = getCurrentDateTime();

    // Chequear si es de lunes a viernes y si la hora está entre 10:00 y 18:00
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hours >= 10 && hours <= 18) {
        const data = await fetchDollarData();

        if (!data) {
            console.error('No se pudo obtener la información del dólar.');
            return;
        }

        const changes = [];

        for (const item of data) {
            const lastValue = lastQuotes[item.nombre] ? lastQuotes[item.nombre].venta : null;
            const currentValue = item.venta;

            if (lastValue !== null && lastValue !== currentValue) {
                // Calcular el porcentaje de cambio
                const changePercentage = (((currentValue - lastValue) / lastValue) * 100).toFixed(2);
                changes.push({
                    nombre: item.nombre,
                    venta: currentValue,
                    change: changePercentage >= 0 ? `+${changePercentage}` : changePercentage, // Formato del cambio
                });
            }
            // Actualizar el valor actual en lastQuotes
            lastQuotes[item.nombre] = { venta: currentValue };
        }

        if (changes.length > 0) {
            const tweetText = formattedTweet(changes, dateTimeString);
            try {
                const tweetResponse = await client.v2.tweet(tweetText);
                console.log('Tweet posteado:', tweetResponse);
            } catch (error) {
                console.error('Error al postear tweet:', error);
            }
        } else {
            console.log('No hubo cambios en las cotizaciones.');
        }
    } else {
        console.log(`Fuera del horario o día permitido (Lunes a Viernes, 10:00 AM - 18:00 PM). No se posteará el tweet.`);
    }
}

// Llamar a la función de tweet cada 10 minutos
setInterval(tweet, 10 * 60 * 1000);
tweet(); // Llamar inmediatamente para el primer tweet
