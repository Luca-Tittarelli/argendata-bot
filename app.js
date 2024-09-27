import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import { dolarAPI } from './apis.js';
import { format, utcToZonedTime } from 'date-fns-tz';
import express from 'express'; // Importar Express

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000; // Usar el puerto definido por Render o 3000 por defecto

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
    // Obtener la fecha actual en UTC
    const now = new Date();

    // Definir la zona horaria de Buenos Aires
    const timeZone = 'America/Argentina/Buenos_Aires';

    // Convertir la fecha actual a la zona horaria de Buenos Aires
    const zonedTime = utcToZonedTime(now, timeZone);

    // Formatear la fecha y hora
    const formattedDateTime = format(zonedTime, 'dd-MM HH-mm', { timeZone });

    const hours = zonedTime.getHours(); // Obtener horas de la fecha zonificada
    const dayOfWeek = zonedTime.getDay(); // Obtener día de la semana (0 = domingo, 6 = sábado)

    return {
        dateTimeString: formattedDateTime,
        hours: parseInt(hours, 10), // Convertir a número para facilitar comparación
        dayOfWeek: dayOfWeek,
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

// Endpoint para mantener la aplicación activa
app.get('/ping', (req, res) => {
    res.send('Pong!');
});

// Llamar a la función de tweet cada 30 minutos
setInterval(tweet, 30 * 60 * 1000);
tweet(); // Llamar inmediatamente para el primer tweet

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
