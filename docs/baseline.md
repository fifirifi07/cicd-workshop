# Baseline — pomiar stanu wyjściowego

Plik uzupełniasz w ZADANIU 01. Czasy odczytujesz w zakładce **Actions**. Wystarczy dokładność
do sekundy.

## Czasy kroków — przebieg na `main`

| Krok | Czas |
|---|---|
| Set up job | 1s |
| Checkout | 1s |
| Set up Node | 1s |
| Install dependencies | 39s |
| Install Playwright browsers | 18s |
| Unit tests | 1s |
| API tests |20s |
| UI tests | 2m 27s |
| Upload Playwright report | 3s |
| Post Set up Node | 0s |
| Post Checkout | 0s |
| Complete job | 0s |
| **Cały przebieg** | 4m 1s |

## Czas do pierwszego czerwonego sygnału

| Branch | Czas samego testu | Od startu przebiegu do informacji o błędzie |
|---|---|---|
| `demo/failing-unit` | 1s | 61s (1m 1s) |
| `demo/failing-search` | — | 3m 59s (~4 min) |

Co na `demo/failing-unit` stało się z testami API i UI:
Zostały pominięte (status `skipped`) z powodu niepowodzenia poprzedzającego kroku testów jednostkowych (domyślny mechanizm zatrzymywania joba po błędzie).

## `demo/failing-lint` i `demo/failing-security`

| Branch | Wynik przebiegu | Dlaczego tak |
|---|---|---|
| `demo/failing-lint` | Sukces (zielony / pass) | Pipeline w `.github/workflows/ci.yml` w ogóle nie posiada kroku uruchamiającego linter (`npm run lint`), więc naruszenia reguł lintu nie są weryfikowane. |
| `demo/failing-security` | Sukces (zielony / pass) | Pipeline nie zawiera kroku skanowania bezpieczeństwa ani wykrywania sekretów (np. Gitleaks / `npm audit`). Mimo istnienia pliku `.gitleaks.toml`, narzędzie nie jest uruchamiane w CI, przez co commit z kluczem API przeszedł niezauważony. |

## Pięć problemów obecnego pipeline’u

1. **Wszystko w jednym sekwencyjnym jobie:** Brak podziału na niezależne joby i brak zrównoleglenia. Awaria wczesnego kroku (np. Unit tests) blokuje wykonanie kolejnych (API, UI), przez co tracimy całościowy feedback o stanie zmian.
2. **Niepotrzebna instalacja przeglądarek przed szybkimi testami:** Krok `Install Playwright browsers` (~16–18s) wykonuje się przed testami jednostkowymi, które trwają zaledwie 1s i nie potrzebują przeglądarki — opóźnia to najszybszy możliwy feedback.
3. **Brak sprawdzania lintera w CI:** Pipeline nie uruchamia `npm run lint`, przez co błędy stylu i potencjalne bugi wykrywane statycznie trafiają do `main`.
4. **Brak skanowania bezpieczeństwa i sekretów:** Brak kroku Gitleaks w pipeline pozwala na bezproblemowe wypychanie poufnych danych (np. tokenów API) do repozytorium.
5. **Brak cache'owania zależności:** Każdy przebieg pobiera od zera pakiety npm (`npm ci`) oraz binaria przeglądarek Playwright, co niepotrzebnie wydłuża czas trwania pipeline'u i marnuje transfer sieciowy.

## Pomiary z kolejnych zadań

### Zadanie 02 — Triggery i concurrency

| Co | Wynik |
|---|---|
| Liczba przebiegów po szybkich pushach | Wcześniejsze przebiegi zostały anulowane (`Cancelled`), w toku pozostał tylko ostatni |
| Czy PR uruchamia jeden przebieg czy dwa | Dokładnie **jeden** przebieg (tylko zdarzenie `pull_request`, brak zdarzenia `push` dla brancha innego niż `main`) |
| Zaoszczędzone minuty | 2 anulowane przebiegi × ~4 min = **ok. 8 minut** zaoszczędzonego czasu runnerów |

### Zadanie 03 — Szybkie kontrole najpierw i cache

| Co | Przed (Baseline) | Pierwszy przebieg | Drugi przebieg (Cache) |
|---|---|---|---|
| Czas do informacji o błędzie lintu | **nigdy** | — | **12s** (na gałęzi `check-cart`) |
| `Install dependencies` | 39s | 25s | **5s** (cache npm) |
| `Install Playwright browsers` | 18s (wszystkie przeglądarki) | 8s (tylko chromium) | **Pominięty (0s)** — cache hit (`~/.cache/ms-playwright`) |
| Cały przebieg | 4m 01s | 3m 25s | **3m 05s** (skrócenie o 20s) |

- **Weryfikacja błędu w koszyku (`check-cart` / PR #2):** Pipeline zatrzymał się na kroku `Lint` ze statusem czerwonym po zaledwie **12 sekundach** od rozpoczęcia joba (błąd reguł `eqeqeq` oraz `prefer-const`). Kolejne kroki zostały pominięte.
- **Weryfikacja cache:** W drugim przebiegu krok `Cache Playwright browsers` przywrócił przeglądarkę z klucza, a krok instalacji przeglądarki został pominięty (`skipped`). Krok `Install dependencies` skrócił się z 25s do 5s dzięki cache npm.
