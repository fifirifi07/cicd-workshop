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

### Zadanie 09 — Równoległość: najpierw workers, potem shardowanie

#### Dwa rodzaje równoległości:

| | **workers** | **shardowanie** |
|---|---|---|
| Co skaluje | procesy na jednej maszynie | liczbę maszyn |
| Mechanizm | `workers` w `playwright.config.ts` | `strategy.matrix` + `--shard` |
| Twardy limit | rdzenie runnera (4 w GitHub Actions) | 20 współbieżnych jobów (konto Free) |
| Koszt w minutach | **Niski** (stały narzut maszyny ponoszony tylko raz) | **Wysoki** (mnoży narzut bootstrapu runnera przez liczbę shardów) |

#### Pomiary i porównanie konfiguracji:

| Konfiguracja | Czas `UI tests` (najdłuższy job) | Łączny czas jobów (Usage) | Czas całego przebiegu (Wall-clock) |
|---|---|---|---|
| A: `workers: 1`, bez shardowania | 2m 47s (167s) | 4m 56s (296s) | 3m 33s (213s) |
| B: `workers: 4`, bez shardowania | 1m 03s (63s) | **2m 52s (172s)** | 1m 50s (110s) |
| C: 4 shardy × `workers: 4` | **57s** | 5m 13s (313s) | **1m 45s (105s)** |
| dodatkowo: 8 shardów × `workers: 4` | 1m 00s (60s) | 7m 49s (469s) | 1m 45s (105s) |

#### Wnioski i odpowiedzi na pytania:
1. **Co bardziej skróciło czas oczekiwania na wynik — workers czy shardowanie?**
   Zdecydowanie **workers**. Zwiększenie liczby workerów z 1 do 4 na pojedynczym runnerze skróciło czas joba `UI tests` aż o **104 sekundy** (z 2m 47s do 1m 03s). Shardowanie na 4 maszyny dało już tylko dodatkowe 6 sekund zysku (z 63s do 57s), a przy 8 shardach zysk wyniósł 0s (czas najdłuższego sharda wyniósł 60s).
2. **Jak zmienił się łączny czas jobów (koszt infrastruktury)?**
   - Przy **workers: 4** łączny czas jobów **spadł** z 4m 56s do 2m 52s, ponieważ runner skończył pracę szybciej, a narzut rozruchu środowiska był opłacony tylko raz.
   - Przy **shardowaniu** łączny czas jobów **wzrósł drastycznie**: do 5m 13s przy 4 shardach i do aż 7m 49s przy 8 shardach.
3. **Dlaczego więcej shardów nie oznacza proporcjonalnie krótszego przebiegu?**
   Każdy nowy shard to całkowicie nowa wirtualna maszyna. Każdy runner musi od zera wykonać akcje: `checkout`, `setup-node`, `npm ci`, przywrócenie cache przeglądarki Playwright, pobranie artefaktu z buildem aplikacji oraz uruchomienie lokalnego serwera testowego `webServer`. Ten stały narzut rozruchu wynosi ok. 30–35 sekund na każdy shard. Gdy same testy w shardzie trwają kilkanaście sekund, czas konfiguracji środowiska zaczyna całkowicie dominować nad czasem wykonywania testów.
4. **Weryfikacja błędu (`check-catalog`):**
   Dzięki ustawieniu `strategy.fail-fast: false` awaria w `UI tests 2/4` nie anulowała pozostałych trzech shardów (shardy 1, 3 i 4 zakończyły się sukcesem). Dzięki `if: always()` przy kroku uploadu artefaktów na stronie przebiegu pojawiły się wszystkie 4 niezależne raporty: `playwright-report-1` do `playwright-report-4`.

### Zadanie 10 — Matrix, który liczy sam siebie

#### Pomiary i porównanie:

| Co | PR (2 shardy) | main (8 shardów) | main (4 shardy, z Zadania 09) |
|---|---|---|---|
| Czas najdłuższego sharda | **25s** | **56s** | **57s** |
| Łączny czas jobów (Usage) | **127s** (2m 07s) | **451s** (7m 31s) | **313s** (5m 13s) |
| Czas całego przebiegu (Wall-clock) | **1m 08s** (68s) | **1m 38s** (98s) | **1m 45s** (105s) |
| Suma testów ze shardów | **5** (3 + 2) | **123** (15+15+16+16+15+15+16+15) | 123 |
| Jobów jednocześnie w szczycie | **5** | **9** | 5 |
| Headroom do limitu 20 jobów | **15 wolnych slotów** | **11 wolnych slotów** | 15 wolnych slotów |

#### Wnioski:
1. **Dopasowanie zasobów do kontekstu (Fail-fast & Resource optimization):**
   - Na pull requeście uruchamiamy zaledwie 5 testów smoke. Dzielenie ich na 4 lub 8 shardów marnowałoby maszyny. Dynamiczny matrix tworzy dokładnie **2 shardy** (`[1,2]`), co pozwoliło wykonać shardy w 24s i 25s, skracając cały czas walidacji PR do rekordowych **1m 08s**.
   - Spójność mianownika: we wszystkich miejscach (`matrix`, `name`, `--shard`) dynamiczne wyrażenie `${{ github.event_name == 'pull_request' && 2 || 8 }}` gwarantuje, że nie pominiemy żadnego testu (suma testów na `main` wynosi dokładnie 123, a na PR dokładnie 5).
2. **Czy 8 shardów uzasadnia dodatkowy koszt w porównaniu z 4 shardami?**
   - **Nie.** Przejście z 4 na 8 shardów dało zaledwie **1 sekundę zysku** na najdłuższym shardzie (56s vs 57s) i tylko 7 sekund zysku w czasie całego pipeline'u (1m 38s vs 1m 45s).
   - W zamian koszt minut runnerów wzrósł aż o **44%** (z 5m 13s do 7m 31s), a liczba zajętych współbieżnie maszyn w szczycie wzrosła z 5 do 9 (zbliżając się do limitu 20 jobów). Narzut startowy runnerów przy 8 maszynach dominuje nad zyskiem z paralelizacji.

### Zadanie 11 — Scalanie raportów z shardów

| Co | Przed (Zadanie 10) | Po (Zadanie 11) |
|---|---|---|
| Liczba raportów do otwarcia dla pełnego wyniku | 8 (lub 4) osobnych archiwów | **1 scalony raport** (`playwright-report`) |
| Czy raport powstaje przy błędzie | Tak, ale rozbity (osobno dla każdego sharda) | **Tak**, 1 spójny raport (122 zielone, 1 czerwony) |
| Czas joba `UI report` | — (brak) | **15–20s** |
| Zachowanie, gdy testy UI są pominięte | — | Job `UI report` ma status **`Skipped`** (szara ikona) |

#### Kluczowe elementy rozwiązania:
1. **Format pośredni `blob` na CI:**
   - Shardy nie generują już ciężkich raportów HTML, lecz format pośredni `blob` (`['blob'], ['github']`), zachowując lokalnie wygodny reporter `html`.
   - Raporty blob (`blob-report-*`) mają krótki czas retencji (`retention-days: 1`), co oszczędza przestrzeń dyskową na GitHubie.
2. **Dedykowany job scalający (`UI report`):**
   - Pobiera wszystkie raporty cząstkowe za pomocą `pattern: blob-report-*` i `merge-multiple: true`.
   - Łączy wyniki poleceniem `npx playwright merge-reports --reporter=html ./all-blob-reports` i publikuje jeden kompletny raport HTML z `retention-days: 7`.
3. **Odporność na błędy i unikanie fałszywych alarmów:**
   - Warunek `if: always() && needs.test-ui.result != 'skipped'` gwarantuje, że gdy dowolny shard zawiedzie, scalony raport i tak zostanie wygenerowany (pokazując w jednym miejscu 122 zdane testy i 1 błąd ze zrzutem ekranu i śladem wykonania).
   - Gdy zmiany dotyczą tylko dokumentacji (np. `README.md`), a testy UI są pominięte przez filtr ścieżek, `UI report` również otrzymuje status `Skipped`, zamiast failować z powodu braku artefaktów.

### Zadanie 12 — Raportowanie w GitHubie: jeden format dla wszystkich testów

| Co | ZADANIE 01 | Po ZADANIU 12 |
|---|---|---|
| Kliknięć do nazwy testu z błędem | 5–6 kliknięć (przeszukiwanie logów w terminalu lub pobieranie i rozpakowywanie zipa) | **1 kliknięcie** (check run *Test results* lub sekcja Job Summary na stronie przebiegu) |
| Czy trzeba coś pobierać | **Tak** (dla testów UI konieczne było pobranie archiwum HTML) | **Nie** (wszystkie 245 testów widoczne bezpośrednio w UI GitHuba) |
| Czas joba `Test report` | — (brak) | **11–12s** |

#### Kluczowe elementy rozwiązania:
1. **Wspólny standard JUnit XML:**
   - Testy jednostkowe (`vitest.config.ts`), API i UI (`playwright.config.ts`) eksportują wyniki do formatu JUnit XML (`reports/*.xml`).
   - Każdy job publikuje swój raport jako artefakt `junit-*` z `if: always()`, dzięki czemu wyniki powstają zwłaszcza przy awarii testów.
2. **Job `Test report` (Zero-click feedback):**
   - Pobiera wszystkie pliki `junit-*` za pomocą `actions/download-artifact@v4` z `merge-multiple: true`.
   - Tworzy dedykowany check run *Test results* (`dorny/test-reporter@v3` z `fail-on-error: true`), gdzie widać listę wszystkich testów i szczegółowy komunikat błędu z adnotacją.
   - Generuje tabelę podsumowującą w **Job Summary** za pomocą lekkiego skryptu `node scripts/ci-summary.mjs reports/*.xml` (bez potrzeby instalowania node_modules!).
3. **Weryfikacja błędu (`check-discount` / PR #11):**
   - Po wprowadzeniu błędu w `src/shared/discounts.ts`, testy jednostkowe zawiodły.
   - W check runie *Test results* od razu pojawiła się nazwa testu `discountAmount > rounds down, never up` i diff `expected 100 to be 99`.
   - W Job Summary pojawiło się czytelne zestawienie z ikoną ❌ przy zestawie `unit`, a programista nie musiał pobierać ani jednego pliku ani przeszukiwać logów terminala.







### Zadanie 13 — Trace: „błąd w CI, co teraz?”

| Co | `trace: 'on'` | `retain-on-failure` |
|---|---|---|
| Rozmiar `playwright-report` | **13.84 MB** (14 514 129 B) | **0.87 MB** (915 624 B) *(–94%)* |
| Suma rozmiarów `blob-report-*` | **13.32 MB** (13 962 141 B) | **0.35 MB** (367 628 B) *(–97%)* |
| Artefakt z trace'ami na zielonym `main` | — | **brak** (0 artefaktów `traces-*`) |
| Czas od otwarcia trace'a do znalezienia przyczyny | **~1-2 minuty** | — |

#### Odpowiedzi diagnostyczne na podstawie trace'a:
1. **Czy zapytanie do API o produkty się powiodło i co zwróciło dla produktu `p-012`?**
   - **Tak**, zapytanie sieciowe `GET /api/products?category=all&search=Hotfix&sort=name-asc&limit=6` zakończyło się kodem statusu **HTTP 200 OK**.
   - W odpowiedzi zwrócony został produkt `p-012` (*Bluza Hotfix*), posiadający parametr magazynowy **`stock: 2`**. Dane z backendu dotarły do przeglądarki bez przeszkód.
2. **Czy na stronie jest element z etykietą „Ostatnie sztuki”, czy go nie ma wcale?**
   - Elementu **w ogóle nie ma w drzewie DOM** (`element(s) not found`, brak selektora `[data-testid="low-stock"]`). Nie był to element ukryty stylami CSS (np. `display: none` czy `visibility: hidden`), lecz węzeł nie został wyrenderowany przez silnik szablonów React.
3. **Skoro dane są takie, jakie są, a strona wygląda tak, jak wygląda — w którym miejscu kodu szukać przyczyny?**
   - Przyczyna leży w pliku **`src/web/views/Catalog.tsx`** w linii 144. Warunek sterujący wyświetlaniem etykiety niskiego stanu magazynowego został zmieniony z `product.stock <= 3` na `product.stock <= 1`. Ponieważ produkt `p-012` posiada `stock = 2`, warunek `2 <= 1` zwrócił `false` i etykieta nie pojawiła się w DOM.

#### Kluczowe elementy rozwiązania:
1. **`trace: 'retain-on-failure'` w `playwright.config.ts`:**
   - Playwright stale rejestruje wykonanie testu (w buforze pamięci), ale na dysku zachowuje plik trace'a wyłącznie dla testów, które zakończyły się niepowodzeniem.
   - Drastycznie redukuje to rozmiar raportu Playwright (z 13.84 MB do 0.87 MB przy 1 błędzie i do 0.26 MB na w pełni zielonym buildzie) oraz raportów cząstkowych blob (z 13.32 MB do 0.35 MB).
2. **Warunkowy upload trace'ów (`if: failure()`):**
   - Krok `Upload traces` w jobie `test-ui` wykonuje się tylko wtedy, gdy dany shard zakończy się błędem (`if: failure()`).
   - W przebiegu z błędem powstał wyłącznie dedykowany artefakt `traces-4` (228 KB) dla sharda 4. Pozostałe 7 zielonych shardów oraz w pełni udane przebiegi na `main` nie tworzą zbędnych artefaktów.
   - Dłuższy czas przechowywania trace'ów (`retention-days: 14`) zapewnia komfort powrotu do analizy błędu bez zaśmiecania storage'u zielonymi przebiegami.

### Zadanie 14 — Bramka, uprawnienia i domknięcie

#### Zmierz — porównanie dnia

| | Na początku dnia (Zadanie 01) | Na koniec dnia (Zadanie 14) | Zmiana / Korzyść |
|---|---|---|---|
| **Cały przebieg na `main`** | 4m 01s | **1m 38s** (98s) | **2.5x szybciej** (oszczędność 2m 23s) |
| **Cały przebieg na pull requeście** | 4m 01s | **33s** (niedotyczący UI/API) / **1m 08s** (smoke PR) | **3.5x – 7.3x szybciej** |
| **Czas do informacji o zmianie w koszyku (lint)** | **nigdy** (brak lintera w CI) | **16s** (job `Lint and typecheck`) | Natychmiastowe wykrycie błędów statycznych |
| **Czas do informacji o zmianie w rabacie (unit)** | 61s (1m 01s) | **15s** (job `Unit tests`) | **4x szybszy** pierwszy czerwony sygnał |
| **Czy wykrywa token w kodzie** | **nie** (brak skanera) | **tak** (job `Security` z Gitleaks w 13s) | Pełna ochrona przed wyciekiem sekretów |
| **Czy jest raport, gdy testy nie przejdą** | **nie** (kroki pomijane po błędzie) | **tak** (check run *Test results*, Job Summary i scalony HTML) | Zero-click feedback w UI GitHuba |
| **Liczba kontroli na pull requeście** | 1 (jeden monolityczny job) | **1** stała bramka (`Pipeline status`) | Ochrona brancha niezależna od shardów i selektywności |
| **Czy da się scalić zmianę z czerwonym testem** | **tak** (brak ochrony brancha) | **nie** (bramka `Pipeline status` w rulesecie `main`) | Bezpieczeństwo gałęzi produkcyjnej |

#### Kluczowe elementy rozwiązania:
1. **Zasada najmniejszych uprawnień (`least privilege`):**
   - Na poziomie globalnym workflow zdefiniowano `permissions: { contents: read }`.
   - Tylko jedyny job tworzący check run (`Test report`) posiada podwyższone uprawnienia `checks: write`.
2. **Ograniczenie czasu wykonania (`timeout-minutes`):**
   - Każdy job posiada precyzyjnie określony limit (`timeout-minutes: 15`, a bramka `5`), eliminując ryzyko 6-godzinnego zawieszenia runnera.
3. **Końcowa bramka `Pipeline status`:**
   - Działa z `if: always()` i agreguje wyniki wszystkich jobów (`success` oraz `skipped`).
   - GitHub Branch Ruleset wymaga wyłącznie `Pipeline status`, co zapobiega zablokowaniu PR przy pominiętych shardach lub zmianach nazwy jobów dynamicznych.
4. **Weryfikacja ochrony `main`:**
   - Bezpieczna zmiana (PR #12 z `gate-readme`) przeszła pomyślnie z zielonym `Pipeline status` i została automatycznie scalona.
   - Błędna zmiana (PR #13 z `gate-discount`) została zablokowana przez czerwoną bramkę `Pipeline status` po wykryciu błędu przez testy jednostkowe w 49s.
   - Bezpośredni push do `main` został natychmiast odrzucony przez regułę repozytorium (GH013).
