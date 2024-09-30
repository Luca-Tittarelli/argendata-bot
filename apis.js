 const macroAPI = 'https://api.bcra.gob.ar/estadisticas/v2.0/PrincipalesVariables'
 const variableAPI = (id, desde, hasta)=>{ return `https://api.bcra.gob.ar/estadisticas/v2.0/DatosVariable/${id}/${desde}/${hasta}`}
 const dolarAPI = 'https://dolarapi.com/v1/dolares'
 const dolarHistoricoAPI = 'https://api.argentinadatos.com/v1/cotizaciones/dolares/'
 const cotizacionesAPI = 'https://dolarapi.com/v1/cotizaciones'
 const RiesgoPaisHistoricoAPI = 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais'
 const RiesgoPaisAPI = 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo'

module.exports = {
    macroAPI,
    variableAPI,
    dolarAPI,
    dolarHistoricoAPI,
    cotizacionesAPI,
    RiesgoPaisHistoricoAPI,
    RiesgoPaisAPI
};