# Crédits et sources tierces

## Potrace / potrace-wasm 1.0.4

- Potrace : Peter Selinger et contributeurs ; les mentions originales sont conservées dans les fichiers C.
- Port WebAssembly : Igute Chung et contributeurs.
- Dépôt amont : https://github.com/IguteChung/potrace-wasm
- Version source exacte fournie : `915827349e6ce7c9b8077e9442b95c1d775c4cef`.
- Licence : GNU GPL version 2, texte fourni dans `vendor/potrace-LICENSE.txt`.
- Sources et compilation : `vendor/potrace-source/wasm/`, `vendor/potrace-source/src/` et `vendor/potrace-source/build.sh`.
- `vendor/potrace-source/index.js` et `vendor/potrace.js` sont identiques. Le code généré conserve les mentions du runtime Emscripten.

Les modifications propres à Rom3D se trouvent dans les fichiers d’interface, de traitement et d’export à la racine du projet.

## Polices

Le CSS demande DM Sans et Space Grotesk via Google Fonts. Les fichiers de polices ne sont pas redistribués dans ce dossier. Des polices système de remplacement sont prévues.
