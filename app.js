const { TwitterApi } = require('twitter-api-v2');
const dotenv = require('dotenv');
const { dolarAPI } = require('./apis.js');
const { formatInTimeZone } = require('date-fns-tz');

dotenv.config();

let firstQuotes = {};  // Almacena la primera cotización del día
let lastQuotes = {};   // Almacena las últimas cotizaciones
let firstChanges = null; // Para almacenar cambios iniciales

// Función para obtener datos de cotización
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

// Obtener fecha y hora actual en Argentina
function getCurrentDateTime() {
    const now = new Date();
    const argentinaDate = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'dd/MM HH:mm');
    const hours = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'HHmm');
    const dayOfWeek = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'i');

    return {
        dateTimeString: argentinaDate,
        hours: parseInt(hours),
        dayOfWeek: parseInt(dayOfWeek),
    };
}

// Formato de los tweets
function formattedTweet(changes, datetime) {
    return `Cambios en Cotizaciones al ${datetime}hs💸:\n` +
        changes.map(item => `⚫${item.nombre}: $${item.venta} (${item.change}%)`).join('\n');
}

function startFormattedTweet(changes) {
    const now = new Date();
    const argentinaDate = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'dd/MM');
    return `Así abre el mercado hoy ${argentinaDate}💸\n` +
        changes.map(item => `⚫${item.nombre}: $${item.venta}`).join('\n');
}

function endFormattedTweet(changes) {
    const now = new Date();
    const argentinaDate = formatInTimeZone(now, 'America/Argentina/Buenos_Aires', 'dd/MM');
    return `Así cierra el mercado hoy ${argentinaDate}💸\n` +
        changes.map(item => `⚫${item.nombre}: $${item.venta} (${item.change}%)`).join('\n');
}

// Crear el cliente de Twitter
const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET_KEY,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

// Lógica para gestionar los tweets
async function tweet() {
    const { dateTimeString, hours, dayOfWeek } = getCurrentDateTime();

    // Operar solo de lunes a viernes, entre las 10:00 y 18:00
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hours >= 1000 && hours <= 1800) {
        const data = await fetchDollarData();
        if (!data) return;

        const changes = [];
        for (const item of data) {
            const lastValue = lastQuotes[item.nombre]?.venta || null;
            const currentValue = item.venta;

            // Almacenar la primera cotización del día
            if (hours === 1000) {
                firstQuotes[item.nombre] = currentValue; // Guardar el primer valor
            }

            // Calcular la diferencia porcentual respecto a la primera cotización
            const firstValue = firstQuotes[item.nombre];
            if (firstValue !== undefined) {
                const changePercentage = (((currentValue - firstValue) / firstValue) * 100).toFixed(2);
                changes.push({
                    nombre: item.nombre,
                    venta: currentValue,
                    change: changePercentage >= 0 ? `+${changePercentage}` : changePercentage,
                });
            }

            // Actualizar el valor actual en lastQuotes
            lastQuotes[item.nombre] = { venta: currentValue };
        }

        let tweetText = '';
        if (hours === 1000) {
            firstChanges = changes;  // Guardar la primera cotización del día
            tweetText = startFormattedTweet(changes);
        } else if (hours === 1800) {
            tweetText = endFormattedTweet(firstChanges);
        } else if (changes.length > 0) {
            tweetText = formattedTweet(changes, dateTimeString);
        }

        if (tweetText) {
            try {
                // const tweetResponse = await client.v2.tweet(tweetText);
                console.log('Tweet posteado:', tweetText);
            } catch (error) {
                console.error('Error al postear tweet:', error);
            }
        } else {
            console.log('No hubo cambios en las cotizaciones.');
        }
    } else {
        console.log(`Fuera del horario permitido o fin de semana. No se posteará el tweet.`);
    }
}
async function getFirstChanges(){
    const data = await fetchDollarData();
    const changes = data.map(item => ({
        nombre: item.nombre,
        venta: item.venta
    }));
    firstChanges = changes;  // Establecer las primeras cotizaciones
}

getFirstChanges().then(() => {
    console.log('Primeras cotizaciones establecidas:', firstChanges);
});
// Ejecutar cada 10 minutos
setInterval(tweet, 10 * 60 * 1000);  // 10 minutos en milisegundos
tweet();  // Primera llamada