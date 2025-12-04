#!/bin/bash

cd /opt/stacks

# Wenn das Repo nicht existiert → mit sudo klonen
if [ ! -d "fludisplay2" ]; then
    sudo git clone https://github.com/lmn19111996-web/fludisplay2.git
fi

# In das Repo wechseln
cd fludisplay2

# Updates holen (sudo nötig)
sudo git pull https://github.com/lmn19111996-web/fludisplay2.git

# Dependencies installieren (sudo für node_modules)
sudo npm install --production

# Node-Server starten (kein sudo nötig)
exec node server.js
