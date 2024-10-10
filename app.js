const { TwitterApi } = require('twitter-api-v2');
const dotenv = require('dotenv');
const { dolarAPI } = require('./apis.js');
const { formatInTimeZone } = require('date-fns-tz');

dotenv.config();

let firstQuotes = {};  // Almacena la primera cotización del día
let lastQuotes = {};   // Almacena las últimas cotizaciones

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
        for (let i = 0; i < data.length; i++) {
            const currentValue = data[i].venta
            const lastValue = lastQuotes[i]?.venta
            const firstValue = firstQuotes[i]?.venta

            if(currentValue !== lastValue && currentValue !== undefined && lastValue !== undefined){
                const changePercentage = (((currentValue - firstValue) / firstValue) * 100).toFixed(2);
                changes.push({
                    nombre: data[i]?.nombre,
                    venta: currentValue,
                    change: changePercentage >= 0 ? `+${changePercentage}` : changePercentage, // Formato del cambio
                });
            }
            if(hours === 1800){
                const changePercentage = (((currentValue - firstValue) / firstValue) * 100).toFixed(2);
                changes.push({
                    nombre: data[i]?.nombre,
                    venta: currentValue,
                    change: changePercentage >= 0 ? `+${changePercentage}` : changePercentage, // Formato del cambio
                });
            }
        }
        let tweetText = null
        if(hours === 1000){
            tweetText = startFormattedTweet(data, dateTimeString)
        } 
        else if (hours === 1800) {
            tweetText = endFormattedTweet(changes, dateTimeString);
        } 
        else if(changes.length > 0){
            tweetText = formattedTweet(changes, dateTimeString)
        }
        if(tweetText){
            try {
                const tweetResponse = await client.v2.tweet(tweetText);
                console.log('Tweet posteado:', tweetResponse);
            } catch (error) {
                console.error('Error al postear tweet:', error);
            }
        }
        else{
            console.log("No hubo cambios en las cotizaciones")
        }
        lastQuotes = data
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
    firstQuotes = changes;  // Establecer las primeras cotizaciones
}

getFirstChanges().then(() => {
    console.log('Primeras cotizaciones establecidas:', firstQuotes);
});
// Ejecutar cada 10 minutos
setInterval(tweet, 10 * 60 * 1000);  // 10 minutos en milisegundos
tweet();  // Primera llamada