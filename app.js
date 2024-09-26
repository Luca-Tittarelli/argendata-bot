import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import { dolarAPI } from './apis.js';

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
    const date = new Date();

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses empiezan desde 0, así que sumamos 1

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return {
        dateTimeString: `${day}-${month} ${hours}:${minutes}`,
        hours: parseInt(hours, 10), // Convertir a número para facilitar comparación
    };
}

function formattedTweet(data, datetime) {
    return `Principales Cotizaciones hoy ${datetime}:\n` +
        data.map(item => `${item.nombre}: $${item.venta}`).join('\n');
}

// Crear el cliente de Twitter
const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET_KEY,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

async function tweet() {
    const { dateTimeString, hours } = getCurrentDateTime();

    // Chequear si la hora está entre las 10:00 AM y las 18:00 PM
    if (hours >= 10 && hours < 18) {
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
        console.log(`Fuera del horario permitido (10:00 AM - 18:00 PM). No se posteará el tweet.`);
    }
}

// Llamar a la función de tweet
tweet();