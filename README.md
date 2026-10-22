# Comprobador PHP2Shell

Comprueba si un servidor está afectado por las vulnerabilidades críticas de PHP **CVE-2026-109618** y **CVE-2026-109619** (CVSS 9.2, publicadas el 21/10/2026).

👉 **https://robertocifre.github.io/php2shell-check/**

## Cómo funciona

- **Tu servidor (fiable):** ejecutas un comando de solo lectura, pegas la salida y obtienes el veredicto y el comando para parchear según tu distribución. Evalúa todas las versiones de PHP instaladas, detecta procesos que siguen usando la versión antigua porque no se reiniciaron y avisa si hay contenedores en marcha, cuyo PHP hay que revisar por dentro. Este paso se calcula en tu navegador: no se envía nada.
- **Una web ajena (orientativo):** escribes la dirección (o pegas la salida de `curl -sIL`) y ves qué enseña desde fuera. Casi nunca basta para confirmar que está a salvo, y la herramienta lo dice.

La página no carga nada de terceros y declara una Content-Security-Policy que solo le permite conectar con el Worker del modo automático.

## Fuentes

Versiones corregidas comprobadas el 22/10/2026 en los datos oficiales: [Ubuntu](https://ubuntu.com/security/CVE-2026-109618) (JSON de su API), [Debian](https://security-tracker.debian.org/tracker/CVE-2026-109618) y [php.net](https://www.php.net/releases/) (8.2.35, 8.3.36, 8.4.27, 8.5.12).

## Worker (modo automático)

`worker/` es un Cloudflare Worker que pide a una web pública **solo sus cabeceras** y las devuelve. No lee el contenido, no guarda nada y no registra las direcciones. Para que no sirva de proxy abierto: solo http/https en puertos 80 y 443, nada de IPs ni dominios internos, cada redirección se vuelve a validar (máximo 5), tiempo máximo de 8 s, límite de consultas por IP y global, y de las cookies solo devuelve el nombre.

```
cd worker
npx wrangler@4 login
npx wrangler@4 deploy
```

## Aviso

Herramienta orientativa y sin garantía. Si tu caso sale como "Revisar", consulta el aviso de seguridad de tu distribución o proveedor. Licencia MIT.
