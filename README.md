# Szybki feedback w CI/CD — repozytorium warsztatowe

Aplikacja demonstracyjna i wyjściowy pipeline dla warsztatu *„Szybki feedback w CI/CD:
jak zaprojektować pipeline, który buduje, testuje i wdraża bez utraty jakości”*.

Repozytorium startuje w stanie **celowo nieoptymalnym**. Twoim zadaniem podczas warsztatu
będzie przebudowanie go krok po kroku — nie napisanie testów od zera.

## Szybki start

```bash
npm ci
npx playwright install --with-deps chromium
npm run verify          # lint + typecheck + build + testy jednostkowe
npm run dev             # aplikacja na http://localhost:5173
```

> **Zanim przyjdziesz na warsztat** przeczytaj [docs/README.md](docs/README.md) —
> tam jest komplet wymagań i kroków przygotowania, łącznie z tymi, które trzeba
> wyklikać w ustawieniach repozytorium.

## Co tu jest

| Ścieżka | Zawartość |
|---|---|
| `src/shared/` | logika domenowa: koszyk, rabaty, walidacja, filtry — cel testów jednostkowych |
| `src/server/` | REST API (Express) + kontrakt OpenAPI |
| `src/web/` | frontend (Vite + React) |
| `tests/unit/` | 78 testów jednostkowych (Vitest) |
| `tests/api/` | 44 testy API (Playwright) |
| `tests/ui/` | 123 testy UI — 5 oznaczonych `@smoke`, reszta to regresja |
| `.github/workflows/ci.yml` | **wyjściowy pipeline — punkt startu warsztatu** |
| `docs/baseline.md` | szablon pomiarów, który uzupełniasz w ZADANIU 01 |

Zadania pojawiają się w trakcie warsztatu na branchu
[`zadania`](https://github.com/tklepacki/cicd-fast-feedback-workshop/tree/zadania).

## Aplikacja

Sklep: katalog → koszyk → zamówienie. Dane żyją w pamięci procesu, więc **restart serwera
przywraca stan wyjściowy** — każdy przebieg testów startuje z identycznych danych.

Dokumentacja API: **http://localhost:3000/api/docs** (Swagger UI),
kontrakt: `/api/openapi.json`.

Kody rabatowe do testów:

| Kod | Działanie |
|---|---|
| `WELCOME10` | −10% |
| `FREESHIP` | darmowa dostawa |
| `MEGA50` | −50% i darmowa dostawa |
| `SUMMER20` | **wygasły** — ścieżka błędu |

Darmowa dostawa od 200 zł, poniżej progu 15 zł.

## Polecenia

| Polecenie | Co robi |
|---|---|
| `npm run dev` | API (3000) + frontend (5173) w trybie deweloperskim |
| `npm run build` | build frontendu i serwera do `dist/` |
| `npm start` | uruchamia zbudowaną aplikację na porcie 3000 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript bez emisji |
| `npm run test:unit` | testy jednostkowe |
| `npm run test:api` | testy API |
| `npm run test:ui` | testy UI (Chromium) |
| `npm run test:smoke` | tylko testy `@smoke` |
| `npm run verify` | lint + typecheck + build + testy jednostkowe |

## Dwie zmienne środowiskowe, które warto znać

**`BASE_URL`** — adres testowanej aplikacji. Bez niej Playwright sam uruchamia lokalną
instancję; z nią kieruje cały zestaw testów na dowolne inne środowisko. To jedyna różnica
między „testuję na runnerze" a „testuję wdrożone środowisko".

**`API_LATENCY_MS`** — symulowane opóźnienie odpowiedzi API, domyślnie `150`.
Bez niego API odpowiada w ułamku milisekundy, bo dane są w pamięci — a żaden prawdziwy
sklep tak się nie zachowuje. Ustaw `0`, żeby wyłączyć.
Ostatnia poprawka dnia.
