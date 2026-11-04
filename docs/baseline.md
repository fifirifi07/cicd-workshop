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

### Zadanie 04 — Rozbicie na joby i `needs`

#### Odpowiedzi na pytania (krok 1):
1. **Czy lint, testy jednostkowe i build zależą od siebie, czy mogą wystartować równolegle?**
   Mogą wystartować równolegle. Żadne z nich nie potrzebuje wyniku ani artefaktów pozostałych — lint bada statycznie składnię i styl, testy jednostkowe testują izolowane funkcje w pamięci, a build kompiluje paczkę produkcyjną.
2. **Czy testy API i UI powinny wystartować, jeśli aplikacja się nie buduje?**
   Nie. Testy API i UI uruchamiają aplikację przez lokalny serwer (`webServer`), więc jeśli build zawiedzie, testy i tak zakończą się błędem. Ich uruchamianie byłoby stratą minut runnera.
3. **Czy warto uruchamiać drogie testy API i UI, jeśli lint albo testy jednostkowe już wykryły problem?**
   Nie. Zgodnie z zasadą *fail-fast*, jeśli tańsze i szybsze kontrole wykryły błąd, nie ma sensu marnować minut na kosztowne testy UI (trwające ponad 2 minuty), bo kod i tak nie może trafić do `main`.
4. **Na co testy API i UI czekają, bo muszą, a na co tylko dlatego, że tak zdecydowaliśmy?**
   Na `build` czekają, bo **muszą** (zależność techniczna — serwer potrzebuje skompilowanej aplikacji). Na `quality` (lint/typecheck) oraz `unit` czekają **dlatego, że tak zdecydowaliśmy** (świadoma bramka kosztowo-jakościowa, by oszczędzać zasoby).

#### Pomiary i porównanie:

| Co | Po ZADANIU 03 | Po ZADANIU 04 |
|---|---|---|
| Czas całego przebiegu (Total duration) | 3m 05s | **3m 15s** |
| **Suma** czasów wszystkich jobów (Usage) | 3m 05s (1 job) | **4m 09s** (suma 5 jobów) |
| Czas do informacji o błędzie lintu | 12s | **28s** |
| Liczba kontroli widocznych na pull requeście | 1 (`test`) | **5** (`Lint and typecheck`, `Unit tests`, `Build`, `API tests`, `UI tests`) |

- **Przebieg na `main`:** Joby `Lint and typecheck` (17s), `Unit tests` (10s) i `Build` (12s) wystartowały równolegle. Po ich pomyślnym zakończeniu równolegle wystartowały `API tests` (43s) oraz `UI tests` (2m 47s).
- **Przebieg na PR (`check-cart-2` / PR #3):** Job `Lint and typecheck` zakończył się błędem po 28s. Dzięki `needs: [build, quality, unit]` joby `API tests` oraz `UI tests` w ogóle nie wystartowały (status `skipped`), oszczędzając ponad 2,5 minuty pracy ciężkich runnerów Playwright. Na PR widoczne jest dokładnie 5 osobnych kontroli z czytelnym wskazaniem, który job zawiódł.

### Zadanie 05 — Artefakt builda zamiast trzech buildów

| Co | Po ZADANIU 04 | Po ZADANIU 05 |
|---|---|---|
| Ile razy budowana jest aplikacja | 3 (Build + 2× webServer) | **1** (tylko raz w jobie `Build`) |
| Czas joba `UI tests` | 2m 47s (167s) | **2m 46s** (166s) |
| Czas joba `API tests` | 43s | **31s** (skrócenie o 12s) |
| Suma czasów wszystkich jobów (Usage) | 4m 09s (249s) | **4m 06s** (246s) |
| Czas całego przebiegu (Total duration) | 3m 15s | **3m 14s** |

- **Jeden build (Single Source of Truth):** Job `Build` publikuje katalog `dist/` jako artefakt z `retention-days: 1`. Joby `API tests` oraz `UI tests` pobierają gotową paczkę przez `actions/download-artifact@v4` i uruchamiają aplikację komendą `npm start` zamiast ponownie kompilować kod w `webServer`.
- **Weryfikacja błędu builda (`check-build` / PR #4):** Import nieistniejącego pliku CSS zatrzymał job `Build` na czerwono. Joby `Lint and typecheck` i `Unit tests` były zielone, a `API tests` i `UI tests` w ogóle nie wystartowały (status `skipped`), zapobiegając uruchomieniu testów na nieskompilowanym kodzie.

### Zadanie 06 — Skan bezpieczeństwa

| Co | Po ZADANIU 05 | Po ZADANIU 06 |
|---|---|---|
| Czas do informacji o tokenie w kodzie | **nigdy** (przechodziło) | **15s** (na gałęzi `check-payments`) |
| Czas joba `Security` | — | **12s** (na `main`) |
| Czas całego przebiegu (Total duration) | 3m 14s | **3m 15s** |

#### Decyzja: blokować czy ostrzegać? (krok 4)
Job `Security` bezwzględnie powinien **blokować** scalenie pull requesta, ponieważ wyciek poufnych danych (np. klucza API do bramki płatności) lub wprowadzenie biblioteki ze znaną podatnością poziomu *high/critical* bezpośrednio narusza bezpieczeństwo aplikacji i infrastruktury, a po zmergowaniu sekret zostaje trwale utrwalony w historii gita i wymaga natychmiastowej procedury rotacji oraz unieważnienia u dostawcy.

- **Weryfikacja na `main`:** Job `Security` wystartował równolegle z `quality`, `unit` i `build`, zakończył się sukcesem po **12 sekundach** (brak podatności i sekretów w czystym kodzie), znacznie szybciej niż testy UI.
- **Weryfikacja wycieku sekretu (`check-payments` / PR #5):** Job `Security` zatrzymał się na czerwono po **15 sekundach**. W logach Gitleaks poprawnie zidentyfikował plik `src/server/payments.ts`, regułę `workshop-api-token` oraz zredagował wartość tokenu (`REDACTED`), nie ujawniając go w logach CI.

### Zadanie 07 — Trzy tryby uruchomienia: PR, main, noc

| Co | Przed (Zadanie 06) | Po (Zadanie 07) |
|---|---|---|
| Czas `UI tests` na pull requeście | 2m 46s | **49s** |
| Czas `UI tests` na `main` | 2m 46s | **2m 53s** (173s) |
| Całkowity czas przebiegu pull requesta | 3m 15s | **1m 26s** (86s) |
| Liczba testów UI na pull requeście | 123 | **5** (tylko `@smoke`) |

#### Trzy tryby wykonania testów UI:
1. **Pull Request (`pull_request`):**
   - Nazwa joba: `UI tests (smoke)`
   - Uruchamiane testy: tylko krytyczna ścieżka oznaczona tagiem `@smoke` (`npx playwright test --project=ui-chromium --grep @smoke`).
   - Wynik: **5 passed** w zaledwie 9 sekund (cały job 49s).
   - Całkowity czas walidacji PR spadł z ponad 3 minut do **1m 26s**, dając programistom natychmiastowy feedback.
2. **Push na `main` oraz przebieg nocny (cron `0 2 * * *` UTC):**
   - Nazwa joba: `UI tests (full regression)`
   - Uruchamiane testy: pełen zestaw (`npx playwright test --project=ui-chromium`).
   - Wynik na `main`: **123 passed** w 2m 53s.
3. **Ręczne uruchomienie (`workflow_dispatch`):**
   - Możliwość wyboru zestawu parametrów (`smoke`, `regression`, `all`).
   - Przetestowano wybór `regression`: job otrzymał nazwę `UI tests (regression)`, wykonał flagę `--grep-invert @smoke` i zakończył się sukcesem z wynikiem **118 passed** w 2m 40s.

### Zadanie 08 — Selektywność na dwóch poziomach

| Scenariusz | Czas przebiegu | Wynik jobów testowych |
|---|---|---|
| Zmiana tylko w `README.md` | **42s** | `API tests` i `UI tests` pominięte (`Skipped`) |
| Zmiana w `src/web/` | **1m 26s** (86s) | `API tests` pominięte (`Skipped`), `UI tests (smoke)` wykonane |
| Pull request bez selektywności (wynik z ZADANIA 07) | **1m 26s** (86s) | Zawsze uruchamiane i `API tests` (27s), i `UI tests (smoke)` (49s) |

#### Dlaczego `--only-changed` nie nadaje się jako jedyny filtr testów UI w CI:
Testy UI nie importują bezpośrednio modułów kodu źródłowego aplikacji (otwierają działającą aplikację przez przeglądarkę pod adresem URL), w związku z czym analiza statyczna importów gita w `playwright test --only-changed` nie wykrywa powiązania między zmianami w komponentach i widokach (np. `src/web/views/Catalog.tsx`) a plikami testów Playwright, raportując 0 testów do uruchomienia (`Total: 0 tests in 0 files`) przy realnej modyfikacji logiki interfejsu.


