# Contrato esperado para la API del INE

La aplicación consulta `INE_API_SECTIONS_URL` desde el servidor. Nunca expone `INE_API_KEY` al navegador.

## Solicitudes

El adaptador envía uno de estos grupos de parámetros:

- búsqueda: `?query=1234`, `?query=22010` o `?query=Zona%20Río`;
- ubicación: `?latitude=32.523&longitude=-117.021`.

Si existe `INE_API_KEY`, se envía como `Authorization: Bearer <token>`.

## Respuesta normalizada

La respuesta puede ser un registro, un arreglo de registros o estar dentro de `data`, `results` o `secciones`. Cada registro debe contener:

```json
{
  "seccion": "1234",
  "cp": "22010",
  "colonia": "Zona Río",
  "ciudad": "Tijuana",
  "participacion": 54,
  "promedioMunicipal": 48,
  "grupoLider": "mujeres de 30 a 49 años",
  "participacionLider": 68,
  "participacionJoven": 29,
  "jovenesParaTop": 150,
  "rankingMeta": 3,
  "lat": 32.523,
  "lng": -117.021
}
```

Cuando el INE entregue su documentación, `lib/ine-api-server.ts` debe mapear los nombres oficiales a este contrato interno. Así, el frontend, el carrusel, la geolocalización y el buzón no necesitarán cambios adicionales.
