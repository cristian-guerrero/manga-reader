---
name: ""
overview: ""
todos: []
---

# Renombrar Folders a One Shot

## Alcance

Renombrar la funcionalidad de "folders" a "oneShot" internamente (camelCase), mientras el usuario ve "One shot" (con espacio). Esto incluye:

- Renombrar archivos y componentes
- Actualizar tipos y rutas de navegación
- Cambiar claves de traducción
- Actualizar localStorage keys
- Modificar referencias en stores y configuración

## Archivos a Modificar

### Frontend - Componentes y Rutas

1. **[frontend/src/components/browser/FoldersPage.tsx](frontend/src/components/browser/FoldersPage.tsx)**

- Renombrar archivo a `OneShotPage.tsx`
- Cambiar función `FoldersPage` → `OneShotPage`
- Actualizar localStorage keys: `folders_sortBy` → `oneShot_sortBy`, `folders_sortOrder` → `oneShot_sortOrder`
- Actualizar claves de traducción: `t('folders.*')` → `t('oneShot.*')`
- Mantener lógica funcional sin cambios

2. **[frontend/src/App.tsx](frontend/src/App.tsx)**

- Cambiar import: `FoldersPage` → `OneShotPage`
- Actualizar case en router: `'folders'` → `'oneShot'`
- Actualizar array `mainPages`: `'folders'` → `'oneShot'`

3. **[frontend/src/components/layout/Sidebar.tsx](frontend/src/components/layout/Sidebar.tsx)**

- Actualizar `NavItem` id: `'folders'` → `'oneShot'`
- Cambiar `labelKey`: `'navigation.folders'` → `'navigation.oneShot'`

### Frontend - Tipos y Stores

4. **[frontend/src/types/index.ts](frontend/src/types/index.ts)**

- Actualizar `PageType`: `'folders'` → `'oneShot'`
- Actualizar `DEFAULT_SETTINGS.enabledMenuItems`: `'folders'` → `'oneShot'`

5. **[frontend/src/stores/navigationStore.ts](frontend/src/stores/navigationStore.ts)**

- Actualizar array `mainPages`: `'folders'` → `'oneShot'`
- (El estado `folders` se mantiene ya que representa datos de FolderInfo, no el nombre de la página)

### Frontend - Traducciones

6. **[frontend/src/i18n/locales/en.json](frontend/src/i18n/locales/en.json)**

- Renombrar sección `"folders"` → `"oneShot"`
- Cambiar `"title": "Folders"` → `"title": "One shot"`
- Actualizar `"navigation.folders"` → `"navigation.oneShot": "One shot"`
- Mantener todas las demás keys de la sección

7. **[frontend/src/i18n/locales/es.json](frontend/src/i18n/locales/es.json)**

- Renombrar sección `"folders"` → `"oneShot"`
- Cambiar `"title": "Carpetas"` → `"title": "One shot"`
- Actualizar `"navigation.folders"` → `"navigation.oneShot": "One shot"`
- Traducir otros textos apropiadamente (mantener algunos términos como "carpeta" si aplica)

### Frontend - Otros Archivos que Referencian Folders

8. **[frontend/src/components/HomePage.tsx](frontend/src/components/HomePage.tsx)**

- Buscar y actualizar referencias a `'folders'` en navegación

9. **[frontend/src/components/layout/MainLayout.tsx](frontend/src/components/layout/MainLayout.tsx)**

- Actualizar referencias a `t('folders.*')` si existen

10. **[frontend/src/components/settings/SettingsPage.tsx](frontend/src/components/settings/SettingsPage.tsx)**

- Actualizar referencias en menu items configuration

11. Cualquier otro archivo que use `'folders'` como ruta o clave de traducción

## Consideraciones

- **Migración de localStorage**: Los usuarios existentes tendrán `folders_sortBy` y `folders_sortOrder` guardados. Considerar migración automática o mantener compatibilidad temporal.
- **Backend**: No se requieren cambios en Go, ya que usa "library" y "FolderInfo" genéricos.
- **FolderInfo type**: Se mantiene sin cambios ya que representa datos de carpeta del sistema, no la funcionalidad específica.
- **Testing**: Verificar que la navegación, ordenamiento persistente y todas las funciones sigan trabajando.

## Notas de Implementación

- **Formato interno**: Usar `oneShot` (camelCase) para todas las rutas, tipos, y claves internas
- **Formato de visualización**: Usar "One shot" (con espacio y mayúscula inicial) para textos visibles al usuario
- **localStorage keys**: Usar `oneShot_sortBy` y `oneShot_sortOrder` (camelCase)

## Orden de Implementación

1. Renombrar archivo y componente principal
2. Actualizar tipos y rutas (usando camelCase `oneShot`)
3. Actualizar traducciones
4. Actualizar referencias en stores y otros componentes