# Basis-Image
FROM node:24.11.1-alpine3.21

# Arbeitsverzeichnis
WORKDIR /opt/stacks

# User & Group anlegen
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Git & bash installieren
RUN apk add --no-cache git bash

# Startscript kopieren
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Benutzer wechseln
USER nextjs

# Port freigeben
EXPOSE 7000

# EntryPoint: beim Start wird start.sh ausgeführt
ENTRYPOINT ["/start.sh"]