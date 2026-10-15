# Cumplimiento de Licencia y Atribución

Este proyecto, **AutomatariumTec PWA**, incorpora, adapta y extiende conceptos, algoritmos y componentes visuales originarios del software libre **[Automatarium](https://github.com/automatarium/automatarium)**, el cual se distribuye bajo los términos de la **Licencia MIT**.

---

## 1. Declaración de Derechos de Autor Originales
```
MIT License
Copyright (c) 2022 Automatarium
```

### Colaboradores y Autores Originales de Automatarium:
* **Maxwell Reid** ([maxwellreid.tech](https://maxwellreid.tech/))
* **Thomas Dib** ([tdib.xyz](https://tdib.xyz/))
* **Ewan Breakey** ([ewanb.me](https://ewanb.me/))
* **Benji Grant** ([bengrant.dev](https://bengrant.dev/))
* **Timothy Tran**

---

## 2. Modificaciones y Adaptaciones Realizadas
En cumplimiento con la cláusula de permiso y redistribución de la Licencia MIT:

1. **Especialización de Modos**: Se simplificó el núcleo para enfocarse exclusivamente en dos modalidades esenciales para cursos de Teoría de Autómatas y Compiladores:
   - **Autómatas Finitos Deterministas (AFD)**.
   - **Diagramas de Transición para Analizadores Léxicos** (soporte para emisión de Tokens, retracción/lookahead `*`, e integración con tabla de símbolos).
   - Se removieron máquinas de Turing, autómatas de pila (PDA) y máquinas de Moore/Mealy innecesarias para estos objetivos.
2. **Arquitectura Offline-First**: Implementación como Progressive Web App (PWA) con almacenamiento local robusto en IndexedDB y sincronización con Firebase Firestore.
3. **Módulo de Gestión Docente y Alumnos**:
   - Creación y administración de grupos.
   - Carga masiva mediante CSV por Número de Control y Nombre Completo.
   - Generación de contraseñas temporales y flujo de primer inicio de sesión.
   - Asignación de actividades, ejercicios y revisión de entregas en línea y fuera de línea.
4. **Crédito en la Interfaz de Usuario**: La aplicación incluye en su pie de página y en la ventana modal "Acerca de" la mención expresa a Automatarium y el enlace a su repositorio oficial.
