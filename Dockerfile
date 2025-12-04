FROM node:24.11.1-alpine3.21

# Pakete installieren (sudo, git, bash)
RUN apk add --no-cache git bash sudo

# Arbeitsverzeichnis
WORKDIR /opt/stacks

# User & Gruppe erstellen
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# nextjs alle sudo-Rechte geben (ohne Passwort)
RUN echo "nextjs ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Startskript kopieren
COPY start.sh /start.sh
RUN chmod +x /start.sh

# User wechseln (wir arbeiten jetzt als nächjs)
USER nextjs

EXPOSE 7000

ENTRYPOINT ["/start.sh"]
