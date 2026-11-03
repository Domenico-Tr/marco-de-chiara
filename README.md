# Sito di Marco De Chiara

Sito statico in HTML, CSS e JavaScript, con un pannello di gestione (Pages CMS) per aggiungere e togliere opere, eventi e contatti senza toccare il codice.

## Struttura

```
vetrina-artista/
├── index.html
├── .pages.yml          configurazione del pannello di gestione
├── .nojekyll           serve a GitHub Pages: lascialo dov'è
├── contenuti/
│   ├── opere.json      le opere
│   ├── processo.json   i video del processo creativo
│   ├── eventi.json     gli eventi
│   └── sito.json       frase di presentazione e contatti
├── video/              video caricati dal pannello
├── css/style.css       stile, colori, animazioni
├── js/categorie.js     categorie del menu
├── js/script.js        funzionamento del sito
└── img/                foto delle opere
```

I file `.pages.yml` e `.nojekyll` iniziano con un punto: su Mac il Finder li nasconde (per vederli premi Cmd + Maiusc + .), su Windows si vedono normalmente.

## Provarlo sul computer

Il sito legge le opere dai file della cartella `contenuti`, e i browser non permettono di farlo a una pagina aperta con un doppio clic. Quindi:

1. In VS Code apri la cartella con **File → Apri cartella…**.
2. Installa l'estensione **Live Server** (di Ritwick Dey).
3. Tasto destro su `index.html` → **Open with Live Server**.

Se apri il file con un doppio clic, al posto delle opere compare un riquadro che spiega cosa fare.

## Il pannello per aggiungere e togliere opere

Come funziona: il sito sta su GitHub, che lo pubblica gratis con GitHub Pages. Pages CMS (app.pagescms.org) è un pannello web open source che legge `.pages.yml` e mostra dei moduli: elenco delle opere con foto, categoria, stato e prezzo; eventi con il calendario per le date; presentazione e contatti. Quando si salva, il pannello scrive le modifiche nei file `contenuti/*.json` e mette le foto in `img/`; GitHub Pages ripubblica il sito da solo dopo un paio di minuti.

### 1. Metti il sito su GitHub

1. Crea un account gratuito su github.com.
2. In alto a destra **+ → New repository**. Nome, ad esempio, `marco-de-chiara`; visibilità **Public**; poi **Create repository**.
3. Nella pagina del repository vuoto clicca **uploading an existing file** e trascina **il contenuto** della cartella `vetrina-artista` (non la cartella stessa), compresi `.pages.yml` e `.nojekyll`. Poi **Commit changes**.

### 2. Pubblicalo con GitHub Pages

1. Nel repository vai su **Settings → Pages**.
2. In "Build and deployment" scegli **Deploy from a branch**, ramo **main**, cartella **/ (root)**, poi **Save**.
3. Dopo uno o due minuti in alto compare l'indirizzo del sito, del tipo `https://NOMEUTENTE.github.io/marco-de-chiara/`.

### 3. Collega il pannello

1. Vai su app.pagescms.org e accedi con **Sign in with GitHub**.
2. Quando te lo chiede, installa l'app di Pages CMS su GitHub e dalle accesso **solo** al repository del sito.
3. Apri il repository dal pannello: a sinistra trovi **Opere**, **Eventi** e **Presentazione e contatti**.

### 4. Dai l'accesso a Marco

Dal pannello puoi invitare Marco come collaboratore con la sua email: non gli serve un account GitHub. Può modificare contenuti e foto, ma non la configurazione del pannello.

### Usare il pannello

- **Aggiungere un'opera**: in Opere aggiungi un nuovo elemento all'elenco, compila i campi, carica la foto nel campo "Foto" e salva.
- **Togliere un'opera**: elimina l'elemento dall'elenco e salva.
- **Ordine**: le opere compaiono sul sito nello stesso ordine dell'elenco.
- **Opera in apertura**: attiva "Opera grande in apertura" su una sola opera.
- Dopo il salvataggio, il sito si aggiorna in uno o due minuti: ricarica la pagina.

Le 14 opere e i 6 eventi presenti all'inizio sono **esempi**: la prima cosa da fare è cancellarli dal pannello e inserire quelli veri.

Consigli per le foto: JPG o WebP, circa 1600–2000 px sul lato lungo, sotto i 500 KB ciascuna, con luce diffusa e sfondo neutro. Verticali, orizzontali e quadrate convivono senza problemi. Se una foto non viene trovata, al suo posto il sito mostra un riquadro tratteggiato con il percorso cercato.

## Processo creativo (video)

Nel pannello, la voce **Processo creativo** è un elenco di video. Per ognuno:

- **Titolo** e **Data**: i video più recenti compaiono per primi.
- **Video caricato** oppure **Oppure link al video**, uno dei due:
  - un file MP4 girato col telefono si guarda direttamente nel sito. Meglio sotto i 50 MB: GitHub rifiuta i file oltre i 100 MB e i video pesanti rallentano il sito. I file `.mov` dell'iPhone a volte non partono su Chrome: in quel caso convertili in MP4 (ad esempio con HandBrake, gratuito) oppure usa un link.
  - un link di **YouTube** si guarda nel sito con il lettore di YouTube; un link di **Instagram** o **TikTok** apre il video sul social. Per i video lunghi conviene sempre YouTube.
- **Copertina**: facoltativa, l'immagine mostrata prima di premere play. Per Instagram e TikTok è consigliata, altrimenti compare un fondo verde con l'icona del social.
- **Opera collegata**: se scrivi il titolo esatto di un'opera, sotto il video compare "Guarda l'opera finita".

Se l'elenco è vuoto, la sezione scrive "Presto qui i video dallo studio."

## Modificare i contenuti senza pannello

Si possono anche modificare a mano i file in `contenuti/` con VS Code. Sono in formato JSON: testi tra virgolette doppie, una virgola tra un campo e l'altro, nessuna virgola dopo l'ultimo. Se il file ha un errore, il sito lo segnala al posto delle opere.

Campi di un'opera: `titolo`, `immagine` (es. `"img/tramonto-rosso.jpg"`), `categoria` (Quadri, Stampe, Sculture, Accessori artistici, Altro), `anno`, `tecnica`, `misure`, `edizione`, `descrizione`, `stato` (Disponibile, Venduta, Riservata), `prezzo` (vuoto = "Prezzo su richiesta"), `inEvidenza` (true/false).

## Categorie

Sono in `js/categorie.js`. Se ne aggiungi o rinomini una, cambia allo stesso modo l'elenco `values` del campo `categoria` in `.pages.yml`, così il pannello la propone.

## Icone dei social

Le icone di Instagram e TikTok arrivano da Font Awesome (gratuito), caricato da internet con i due `<script>` in fondo a `index.html`. Senza connessione le icone non compaiono, ma i link funzionano lo stesso.

## Cambiare colori e caratteri

In cima a `css/style.css`, dentro `:root`:

La palette viene da un quadro di Marco: il verde quasi nero dei bordi, l'alone verde acido al centro, i gialli, i magenta e i turchesi dei riccioli. Il sito ha un solo tema, scuro.

- `--parete` è lo sfondo, `--accento` il verde acido (filtro attivo, pulsanti, "In corso"), `--alone` la luce verde dietro l'opera in apertura.
- `--giallo`, `--magenta`, `--turchese`: colori delle sottolineature a pennello del menu. Quale colore va a quale voce si sceglie con `--pigmento` sui `<li>` in `index.html`.
- Caratteri, da Google Fonts (link in `index.html`): Bricolage Grotesque per nome, titoli e testi (`--font-titoli`, `--font-testo`), Fraunces corsivo per i titoli delle opere (`--font-corsivo`).

## Transizioni a pennello

- **Passaggio tra sezioni**: cliccando una voce del menu (o una categoria, o il nome in alto) lo schermo si copre di pennellate, la pagina si sposta sotto il colore e altre pennellate la ripuliscono. È disegnato in `js/script.js`, sezione "2b. Pennellate a tutto schermo".
- **Menu**: su computer il sottomenu "Opere" compare con un colpo di pennello e le voci si sottolineano a pennello; su telefono il pannello si dipinge dall'alto e le voci vengono sottolineate una dopo l'altra.
- **Opere**: cambiando categoria le opere compaiono dipinte una dopo l'altra; nella scheda a tutto schermo ogni opera si dipinge da sinistra (avanti) o da destra (indietro).

Cosa si può cambiare:

- **Colori delle pennellate**: `--pennellata-1` … `--pennellata-4` in cima a `css/style.css`. Ora sono i verdi del fondo del quadro, dal buio alla luce; nel commento lì sopra ci sono altre tavolozze pronte da incollare (Pelle, Riccioli, Inchiostro).
- **Velocità del passaggio**: in `js/script.js` cerca `await anima(` (due righe): i numeri `0.42` e `0.36` sono i secondi di ogni pennellata.
- **Velocità delle comparse**: la variabile `--durata` (in `.rivela` e `.cornice .rivela` nel CSS).
- Chi ha attivato "riduci movimento" nelle impostazioni del telefono o del computer non vede animazioni: il sito salta direttamente alla sezione.

## Dominio personale

Quando vorrai un indirizzo come `marcodechiara.it`, lo compri da un registrar e lo colleghi in **Settings → Pages → Custom domain** del repository.
