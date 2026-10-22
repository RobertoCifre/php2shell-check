# Comprobador PHP2Shell

Comprueba si un servidor está afectado por las vulnerabilidades críticas de PHP **CVE-2026-109618** y **CVE-2026-109619** (CVSS 9.2, publicadas el 21/10/2026).

- **Tu servidor:** ejecuta un comando de solo lectura, pega la salida y obtén el veredicto y el comando para parchear según tu distribución.
- **Una web ajena:** pega las cabeceras de `curl -sIL` y mira qué se puede saber desde fuera (casi nunca basta para confirmar que está a salvo).

Todo se evalúa en el navegador; no se envía nada a ningún servidor.

Versiones corregidas verificadas el 22/10/2026 en ubuntu.com/security, security-tracker.debian.org y el análisis de Rapid7. Herramienta orientativa: ante la duda, consulta el aviso de seguridad de tu distribución.
