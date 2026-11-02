# Przygotowanie do warsztatu

**Szybki feedback w CI/CD: jak zaprojektować pipeline, który buduje, testuje i wdraża bez utraty jakości**

Warsztat ma charakter praktyczny — większość czasu spędzisz, pracując we własnym repozytorium.
Aby nie tracić pierwszej godziny na instalację i konfigurację środowiska, **wykonaj poniższe
kroki przed warsztatem**. Całość powinna zająć około 30 minut.

Ta sama instrukcja do pobrania: [HTML z listą kontrolną](Instrukcja%20przygotowania.html) (otwórz
w przeglądarce po pobraniu) i [Word](Instrukcja%20przygotowania%20-%20Szybki%20feedback%20w%20CICD.docx).

> **Przynieś własny laptop**, na którym możesz instalować oprogramowanie i korzystać z sieci
> bez ograniczeń. Firmowy VPN lub zasady bezpieczeństwa mogą blokować `npm` albo GitHuba,
> dlatego sprawdź to wcześniej.

---

## 1. Narzędzia

Zainstaluj trzy narzędzia w podanych wersjach:

| Narzędzie | Wersja | Strona |
|---|---|---|
| Visual Studio Code | dowolna aktualna | https://code.visualstudio.com/download |
| Node.js | **22 LTS lub nowsza** | https://nodejs.org/ |
| Git | dowolna aktualna | https://git-scm.com/downloads |

Po instalacji otwórz terminal i sprawdź, czy wszystkie narzędzia działają:

```bash
node --version     # v22.x lub nowsza
npm --version
git --version
```

---

## 2. Konto GitHub

Potrzebujesz **prywatnego konta GitHub**. Darmowy plan w zupełności wystarczy.

Jeśli na co dzień korzystasz z konta firmowego objętego logowaniem SSO, na potrzeby warsztatu
użyj konta prywatnego. Firmowe zasady bezpieczeństwa mogą ograniczać tworzenie publicznych
repozytoriów i uruchamianie workflowów.

---

## 3. Własna kopia repozytorium

Otwórz repozytorium warsztatowe:

**https://github.com/tklepacki/cicd-fast-feedback-workshop**

Kliknij zielony przycisk **Use this template** → **Create a new repository** i wybierz
następujące ustawienia:

| Pole | Ustawienie |
|---|---|
| Include all branches (przełącznik na górze formularza) | pozostaw **wyłączony** |
| Owner | Twoje prywatne konto GitHub |
| Repository name | dowolna nazwa, np. `cicd-workshop` |
| Visibility | **Public** |

Potrzebujesz tylko gałęzi `main`. Pozostałe gałęzie pobierzesz w trakcie warsztatu.

> **Repozytorium musi być publiczne.** Nie chodzi o udostępnianie Twojego kodu. Na darmowym
> planie repozytoria publiczne mają nielimitowane minuty GitHub Actions i mocniejsze maszyny
> (4 rdzenie zamiast 2). W repozytorium prywatnym części ćwiczeń nie da się wykonać.

---

## 4. Klonowanie repozytorium i instalacja zależności

Sklonuj utworzone repozytorium na swój komputer, przejdź do jego katalogu i zainstaluj
zależności:

```bash
git clone <adres-Twojego-repozytorium>
cd <nazwa-katalogu>

npm ci
npx playwright install --with-deps chromium
```

> Instalacja przeglądarki jest konieczna, bo podczas warsztatu pracujemy także z testami UI,
> a nie tylko API. Pobieranie Chromium może chwilę potrwać, dlatego zrób to przed warsztatem.

---

## 5. Sprawdzenie środowiska

Uruchom poniższe polecenia, aby upewnić się, że wszystko działa prawidłowo:

```bash
npm run verify       # lint + typecheck + build + testy jednostkowe
npm run test:smoke   # 5 testów UI
npm run dev          # aplikacja: http://localhost:5173
```

Pierwsze polecenie powinno zakończyć się bez błędów i wyświetlić wynik `78 passed`. Drugie
powinno zakończyć się wynikiem `5 passed`.

Aplikacja jest prostym sklepem z katalogiem produktów, koszykiem i formularzem zamówienia.
Dokumentację API znajdziesz pod adresem http://localhost:3000/api/docs, gdy aplikacja jest
uruchomiona.

---

## 6. Sprawdzenie pipeline'u

Po utworzeniu repozytorium pipeline uruchamia się automatycznie. Przejdź do swojego repozytorium
na GitHubie, otwórz zakładkę **Actions** i zaczekaj na zakończenie pierwszego przebiegu.
Powinien zakończyć się na zielono i trwać nieco ponad trzy minuty.

Jeśli zobaczysz informację, że workflowy są wyłączone, włącz je przyciskiem na tej stronie,
a następnie wypchnij dowolny commit na `main`.

Może pojawić się żółty pasek **Compare & pull request** — możesz go zignorować.

Na koniec sprawdź, czy możesz wysyłać zmiany do swojego repozytorium — od pierwszego zadania
będzie to potrzebne:

```bash
git commit --allow-empty -m "Check push access"
git push
```

Push powinien przejść bez błędów, a w zakładce **Actions** powinien pojawić się nowy przebieg.

> **Trzy minuty to nie błąd, tylko nasz punkt wyjścia.** Podczas warsztatu będziemy
> stopniowo skracać ten czas, a na koniec porównamy wyniki i sprawdzimy, które zmiany
> rzeczywiście pomogły.

---

## Lista kontrolna

Sprawdź przed warsztatem:

- [ ] Node.js w wersji 22 lub nowszej jest zainstalowany
- [ ] Git działa poprawnie
- [ ] Visual Studio Code jest zainstalowany
- [ ] Mam prywatne konto GitHub
- [ ] Repozytorium utworzone z szablonu jest **publiczne**
- [ ] Polecenie `npm ci` zakończyło się bez błędów
- [ ] Playwright i Chromium są zainstalowane
- [ ] `npm run verify` — 78 testów zakończonych powodzeniem
- [ ] `npm run test:smoke` — 5 testów zakończonych powodzeniem
- [ ] Pierwszy przebieg w GitHub Actions zakończył się powodzeniem
- [ ] Mogę wysyłać zmiany do swojego repozytorium (`git push`)

---

## Gdy coś nie działa

| Problem | Co zrobić |
|---|---|
| `npm ci` zgłasza błąd związany z wersją Node.js | Sprawdź wersję poleceniem `node --version`. Wymagana jest wersja 22 lub nowsza. |
| Testy kończą się błędem `EADDRINUSE: address already in use :::3000` | Port 3000 zajmuje inna aplikacja, np. serwer deweloperski innego projektu. Sprawdź, która: `lsof -i :3000` (macOS, Linux) albo `netstat -ano \| findstr :3000` (Windows), i ją zatrzymaj. |
| Testy UI wiszą albo kończą się błędem, a w innym terminalu działa `npm run dev` | Zatrzymaj `npm run dev` (Ctrl+C) przed uruchomieniem testów. Playwright podłącza się wtedy do już działającego serwera deweloperskiego, pod którym nie ma frontendu, zamiast uruchomić własną aplikację. |
| Instalacja Playwrighta zatrzymuje się | Przyczyną może być blokada sieciowa. Spróbuj połączyć się przez inną sieć lub bez firmowego VPN. |
| `git push` zwraca błąd 403 | Git loguje się innym kontem niż to, na którym jest repozytorium, np. firmowym. Zaloguj się właściwym kontem (`gh auth login`, a potem `gh auth setup-git`). |
| Pipeline nie uruchamia się | Wróć do kroku 6 i sprawdź, czy workflowy są włączone oraz czy repozytorium jest publiczne. |

Jeśli napotkasz problem, którego nie uda Ci się rozwiązać, napisz do mnie jeszcze przed
warsztatem. Rozwiążemy go wspólnie, żeby nie tracić czasu podczas zajęć.
