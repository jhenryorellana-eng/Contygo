# ContyGo — copia para experimentar

Esta carpeta conserva la landing y el recorrido de servicios tal como estaban el 22 de septiembre de 2026. Es un proyecto Next.js independiente del proyecto original.

Lee `CONTEXTO-DISENO.md` para ubicar el flujo actual, el branding y los recursos antes de probar otra dirección visual.

## Abrirla

Desde esta carpeta, ejecuta:

```powershell
npm run dev
```

Abre **http://127.0.0.1:3001/**. La raíz muestra directamente la versión actual de la landing que en el proyecto original está en `/contygo-app/v5`. También conserva esa ruta y las demás pantallas del recorrido.

El puerto 3001 permite mantener abierto el proyecto original en el 3000. `node_modules` ya está copiado; no hace falta instalar dependencias para esta primera ejecución.

## Qué incluye

- Código completo de `app`, `components` y `lib`, con el flujo de vídeo, agente, servicios y contrato.
- `public` completo: marca, imágenes, vídeos, fuentes y audio usados por la landing.
- Configuración local, dependencias instaladas, scripts, pruebas y documentación del proyecto.
- `material-de-diseno/storyboards-digitales`: la última serie de storyboards claros y oscuros y sus prompts.

La copia de `.env.local` permite probar las funciones configuradas localmente. Contiene credenciales: consérvala en privado y no la publiques.

## Cambios propios de esta copia

Solo el punto de entrada `/` se dirige a la landing actual y `npm run dev` usa el puerto 3001. Puedes modificar cualquier diseño aquí sin alterar los archivos del proyecto original.

Los archivos de producción pesados de `output` y el historial `.git` del proyecto original no son necesarios para ejecutar la página y no se copiaron. Los medios que consume la página están en `public`.
