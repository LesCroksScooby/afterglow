# Soleil

Une petite appli web installable pour savoir à quelle heure le soleil se lève et se couche, où que tu sois, et si ça vaut le coup de sortir le regarder.

## Fonctions

- **Ce soir** : heure du coucher ou du lever, score de beauté sur 100, fiabilité de la prévision.
- **Semaine** : meilleur soir à venir, rappel dans l'agenda, pluies d'étoiles et éclipses de lune.
- **Ciel** : courbe du jour à faire glisser, boussole, météo heure par heure, lune, courbe de l'année.
- **Carnet** : tes notes ajustent le score, tes spots indiquent quand partir, réglage du lieu et des sons.

Le score regarde les nuages sur la route du soleil (40 à 150 km dans sa direction) et ceux au-dessus de toi. C'est une estimation.

## Lancer le projet

Aucune installation ni compilation : ce sont des fichiers statiques.

```bash
python -m http.server 8000
```

Ouvre ensuite http://localhost:8000. Le lieu se choisit dans **Carnet > Réglages**.

Pour la mise en ligne, envoie les fichiers sur n'importe quel hébergement statique en HTTPS. Le HTTPS est nécessaire pour l'installation, le mode hors ligne, la géolocalisation et la boussole.

## Tests

```bash
node --test "tests/*.test.js"
```

## Mise à jour du mode hors ligne

Un fichier modifié arrive à l'ouverture suivante de l'appli. Si tu ajoutes ou renommes un fichier, ajoute-le à `FILES` dans `sw.js` et change `VERSION`.

## Vie privée

Il n'y a ni compte ni statistiques. Le lieu, les notes et les spots restent dans le navigateur. Les coordonnées sont envoyées à [Open-Meteo](https://open-meteo.com/) pour obtenir la météo et le relief, et le nom recherché pour trouver une ville.

## Limites

- Les prévisions couvrent d'hier à J+9.
- Le relief a une précision d'environ 90 m et ne compte ni les arbres ni les maisons.
- Une alerte automatique demanderait un serveur : l'appli propose un rappel dans l'agenda.

## Crédits et licences

- Code : [MIT](LICENSE)
- Calculs astronomiques : SunCalc ([licence](SUNCALC-LICENSE.txt))
- Police Instrument Serif : [SIL OFL](fonts/OFL-LICENSE.txt)
- Météo, géocodage et relief : [Open-Meteo](https://open-meteo.com/)
