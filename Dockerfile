# Verwende ein offizielles Node.js-Image als Basis
FROM node:22

# Setze das Arbeitsverzeichnis
WORKDIR /usr/app

# Kopiere die package.json und package-lock.json (falls vorhanden)
COPY ./ /usr/app/

# Installiere die Abhängigkeiten
RUN npm install

# Definiere den Befehl zum Starten der Anwendung
CMD ["npm", "run", "prod"]