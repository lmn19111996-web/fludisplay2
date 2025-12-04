#!/bin/bash

# Arbeitsverzeichnis wechseln
cd /opt/stacks

# Wenn das Repo noch nicht geklont wurde → klonen
if [ ! -d ".git" ]; then
    git clone https://github.com/lmn19111996-web/fludisplay2.git
else
    # Wenn bereits geklont, dann einfach pullen
    cd /opt/stacks/fludisplay2
    git pull https://github.com/lmn19111996-web/fludisplay2.git
fi

# Node-Server starten
exec node server.js
