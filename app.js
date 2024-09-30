const { TwitterApi } = require('twitter-api-v2');
const dotenv = require('dotenv');
const { dolarAPI } = require('./apis.js');
const { format, formatInTimeZone } = require('date-fns-tz');

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
    // Obtener la fecha actual en la zona horaria de Buenos Aires
    const now = new Date();
    const argentinaDate = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'dd-MM HH:mm');
    const zonedTime = new Date(argentinaDate);

    const hours = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'HH'); // Obtener horas
    const dayOfWeek = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'i'); // Obtener día de la semana (1 = lunes, 7 = domingo)

    return {
        dateTimeString: argentinaDate,
        hours: parseInt(hours, 10), // Convertir a número para facilitar comparación
        dayOfWeek: parseInt(dayOfWeek),
    };
}

function formattedTweet(data, datetime) {
    return `Principales Cotizaciones al ${datetime}💸:\n` +
        data.map(item => `⚫${item.nombre}: $${item.venta}`).join('\n');
}

// Crear el cliente de Twitter
const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET_KEY,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

console.log(getCurrentDateTime());

async function tweet() {
    const { dateTimeString, hours, dayOfWeek } = getCurrentDateTime();

    // Chequear si es de lunes a viernes y si la hora está entre 10:00 y 18:00
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hours >= 10 && hours < 18) {
        const data = await fetchDollarData();

        if (!data) {
            console.error('No se pudo obtener la información del dólar.');
            return;
        }

        const tweetText = formattedTweet(data, dateTimeString);

        try {
            const tweetResponse = await client.v2.tweet(tweetText);
            console.log('Tweet posteado:', tweetResponse);
        } catch (error) {
            console.error('Error al postear tweet:', error);
        }
    } else {
        console.log(`Fuera del horario o día permitido (Lunes a Viernes, 10:00 AM - 18:00 PM). No se posteará el tweet.`);
    }
}
// Llamar a la función de tweet cada 30 minutos
// setInterval(tweet, 30 * 60 * 1000);
// tweet(); // Llamar inmediatamente para el primer tweet
getCurrentDateTime()