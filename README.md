# LatePlate

LatePlate ist ein Full-Stack-Prototyp für zeitlich begrenzte, vergünstigte
Restaurantangebote. Die Expo-App unterstützt aktuell eine passwortlose
Anmeldung, Profil-Onboarding, eine Angebotsübersicht, gespeicherte Favoriten
und vollständige Angebotsdetails. Das FastAPI-Backend verwaltet Nutzer,
Angebote, gespeicherte Angebote, Login-Challenges sowie rotierende Access-
und Refresh Tokens mit absoluter Sessionlebensdauer.

Reservierungen, Bestellungen und Zahlungen sind noch nicht implementiert.
Eine ausführliche Bestandsaufnahme mit Architektur, Risiken, Testabdeckung
und Roadmap steht in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Aktueller Funktionsumfang

Implementiert:

- passwortlose Anmeldung mit Einmalcode oder Magic Link
- JWT Access Tokens und rotierende Refresh Tokens
- absolute maximale Lebensdauer pro Refresh-Sessionfamilie
- Session-Cleanup mit Retention und Batch-Limit
- automatische Session-Erneuerung im Mobile Client
- Profilvervollständigung und geschützte Navigation
- öffentliche Angebotsliste mit lokaler Kategoriefilterung
- Explore-Header mit vorbereitetem Standort-Selector
- Bottom-Tab-Navigation für Explore, Suche, Favoriten und Profil
- eigenständige, scrollbare Angebotsdetailseite
- persistente gespeicherte Angebote über `/api/saved-offers`
- Favoriten-Tab mit eigener gespeicherter Angebotskarte
- Profil-Tab als MVP-Shell mit Identity Card, Impact-Zero-State und Mock-Menüs
- PostgreSQL-Migrationen mit Alembic
- Redis-basierte, atomare Login-Challenges

Teilweise oder nur für Entwicklung verfügbar:

- Codes und Magic Links werden erzeugt, aber noch nicht über einen produktiven
  E-Mail-Provider versendet
- Suche, Profil-Menüaktionen und Standortauswahl sind UI-Einstiegspunkte, aber
  fachlich noch nicht vollständig umgesetzt
- Bezeichnungen wie „Recommended“ und „In your area“ basieren noch nicht auf
  Ranking- oder Standortdaten

## Technologie

| Bereich | Technologien |
| --- | --- |
| Mobile | Expo 57, React Native, Expo Router, TypeScript, Axios, TanStack Query, Zustand, NativeWind, Vitest |
| Backend | FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, pytest |
| Infrastruktur | PostgreSQL 17, Redis 7.4, Docker Compose |

## Voraussetzungen

- Docker Desktop mit Docker Compose
- Node.js und npm
- für die native App: Expo Go oder ein Android-/iOS-Simulator
- für Tests auf einem echten Gerät: Rechner und Gerät im selben Netzwerk

## Lokale Einrichtung

### 1. Backend konfigurieren

Im Repository-Stamm eine lokale `.env` anlegen:

```powershell
Copy-Item .env.example .env
```

Alle leeren Werte müssen ausgefüllt werden. Besonders wichtig sind:

| Variable | Zweck |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | lokale PostgreSQL-Datenbank |
| `DATABASE_URL` | SQLAlchemy-Verbindung; im Docker-Netz ist der Host `db` |
| `REDIS_URL` | Redis-Verbindung; im Docker-Netz ist der Host `redis` |
| `JWT_SECRET` | geheime Signatur des Access Tokens |
| `REFRESH_TOKEN_EXPIRE_DAYS` | gleitende Ablaufzeit einzelner Refresh Tokens |
| `REFRESH_SESSION_ABSOLUTE_LIFETIME_DAYS` | harte maximale Lebensdauer einer Sessionfamilie |
| `REFRESH_SESSION_CLEANUP_RETENTION_DAYS` | Aufbewahrungszeit alter terminaler Refresh Sessions vor Cleanup |
| `REFRESH_SESSION_CLEANUP_BATCH_SIZE` | maximale Anzahl zu löschender Refresh Sessions pro Cleanup-Lauf |
| `REFRESH_ROTATION_GRACE_SECONDS` | vorbereitetes Grace Window für rotierte Refresh Tokens |
| `REFRESH_IDEMPOTENCY_KEY_MIN_LENGTH`, `REFRESH_IDEMPOTENCY_KEY_MAX_LENGTH` | Längengrenzen für Refresh-Idempotency-Keys |
| `AUTH_CHALLENGE_SECRET` | geheimer HMAC-Schlüssel für Login-Challenges, mindestens 32 Zeichen |
| `APP_ENVIRONMENT` | `development`, `test` oder `production` |

Secrets gehören ausschließlich in `.env` und dürfen nicht committed werden.
In `APP_ENVIRONMENT=production` lehnt das Backend schwache oder bekannte
Platzhalterwerte für JWT- und Challenge-Secrets ab.

### 2. Backend und Infrastruktur starten

```powershell
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose ps
```

Danach sind verfügbar:

- API: `http://localhost:8000`
- OpenAPI UI: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

Bei `APP_ENVIRONMENT=development` schreibt das Backend erzeugte Login-Codes
und Magic Links in das Backend-Log. Das dient nur der lokalen Entwicklung:

```powershell
docker compose logs -f backend
```

### 3. Mobile App konfigurieren und starten

```powershell
cd mobile
npm install
Copy-Item .env.example .env
npm start
```

`EXPO_PUBLIC_API_BASE_URL` muss auf die API einschließlich `/api` zeigen:

- Web oder Emulator mit Hostzugriff: `http://localhost:8000/api`
- echtes Gerät: `http://<LAN-IP-DES-RECHNERS>:8000/api`

`EXPO_PUBLIC_*`-Variablen sind öffentlich sichtbar und dürfen keine Secrets
enthalten.

Alternativ stehen folgende Startskripte zur Verfügung:

```powershell
npm run android
npm run ios
npm run web
```

Wenn LAN-Verbindung vom echten Gerät nicht möglich ist, kann der experimentelle
Expo-WS-Tunnel verwendet werden:

```powershell
npm run start:tunnel:clear
```

Dieses Script setzt `EXPO_UNSTABLE_TUNNEL_V2=1` und umgeht damit den alten
ngrok-v2-Pfad von Expo. Es kann einen Expo-Login benötigen:

```powershell
npx expo login
```

Für Backend/API-Tunnel steht zusätzlich ein modernes ngrok-v3-Binary im
Mobile-Projekt bereit:

```powershell
npm run ngrok:version
npm run ngrok:auth -- <NGROK_AUTH_TOKEN>
npm run tunnel:api
```

`EXPO_PUBLIC_API_BASE_URL` muss dabei auf die Backend-URL zeigen, nicht auf
eine `exp://`-Metro-URL.

## Tests und Qualitätsprüfungen

Backend-Testlauf im gestarteten Docker-Container:

```powershell
docker compose exec backend pytest
```

Redis-Integrationstests werden bewusst separat ausgeführt:

```powershell
docker compose exec backend pytest -m redis_integration
```

Mobile-Prüfungen aus `mobile/`:

```powershell
npm test
npm exec tsc -- --noEmit
```

Ein Lint-Skript ist vorhanden:

```powershell
npm run lint
```

Der aktuelle Lint-Lauf ist ausführbar und meldet derzeit nur bestehende
Warnungen, keine Fehler.

## OpenAPI-Typen aktualisieren

Das OpenAPI-Schema des Backends ist die Source of Truth für den Mobile-API-
Vertrag. Bei einer API-Vertragsänderung und laufendem Backend:

```powershell
cd mobile
npm run generate:api
```

Die generierte Datei unter `mobile/src/shared/api/generated/` darf nicht
manuell bearbeitet werden.

Aktueller Auth-Refresh-Vertrag:

- `POST /api/auth/token/refresh` erwartet `refresh_token` und den
  verpflichtenden `idempotency_key`.
- Der Mobile Client speichert einen Pending-Idempotency-Key, bis der
  Refresh-Versuch vollständig verarbeitet wurde.
- Das Backend speichert Refresh Tokens und Idempotency-Keys nur gehasht, nie
  im Klartext.
- Jede Sessionfamilie besitzt ein festes `absolute_expires_at`; Rotation kann
  dieses Datum nicht verlängern.
- Alte expired/revoked/absolut abgelaufene Refresh Sessions können per
  Service-Cleanup in Batches gelöscht werden. Ein Scheduler ist noch nicht
  eingerichtet.

## Repository-Struktur

```text
backend/                 FastAPI-Anwendung, Domainmodule und Tests
  auth/                  Passwordless Auth und Refresh Sessions
  core/                  Konfiguration, Datenbank und Fehlerbehandlung
  migrations/            Alembic-Konfiguration und Migrationen
  offers/                Angebots-API und Geschäftslogik
  saved_offers/          persistente gespeicherte Angebote pro Benutzer
  users/                 Nutzerverwaltung
mobile/                  Expo-/React-Native-App
  src/app/               Expo-Router-Seiten und Layouts
  src/features/          Auth-, Offer-, Saved-Offer-, Profile- und Location-UI
  src/shared/            API Client, Storage und gemeinsame Hilfen
docker-compose.yml       Backend, PostgreSQL und Redis
PROJECT_STATUS.md        Architektur-, Risiko- und Roadmap-Bericht
```

## Wichtige Entwicklungsregeln

- Neue Datenbankänderungen erhalten eine neue Alembic-Migration.
- Neue SQLAlchemy-Modelmodule werden explizit in
  `backend/core/model_registry.py` registriert.
- Backend-Geschäftslogik bleibt in Services und Repositories, nicht in Routes.
- Mobile API-Typen werden aus OpenAPI generiert, nicht manuell nachgebaut.
- Seed-Tests werden nur bewusst ausgeführt, weil sie persistente Daten anlegen.
