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
├── css/tela.webp       la trama della tela sul fondo
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

Il fondo è quasi bianco, come una parete di galleria. I colori vengono da un quadro di Marco: il verde scurissimo dei bordi per i testi, il verde bosco per pulsanti e dettagli, il verde acido dell'alone come luce dietro l'opera in apertura e come "evidenziatore" a pennello, i gialli, i magenta e i turchesi dei riccioli per la macchia di colore e le sottolineature del menu.

- `--parete` è lo sfondo, `--inchiostro` il colore del testo, `--accento` il verde bosco (pulsanti, "In corso", pallino "Disponibile"), `--acido` il verde acido (filtro attivo, pulsante "Guarda" dei video), `--alone` la luce dietro l'opera in apertura.
- `--giallo`, `--magenta`, `--turchese`: colori della macchia sotto le voci del menu, delle sottolineature e dei campioni delle categorie. Quale colore va a quale voce si sceglie con `--pigmento` sui `<li>` in `index.html`.
- `--fascia`: il colore della pennellata dietro la barra del menu e del fondo del menu sul telefono (ora il verde notte `--pennellata-1`).
- Caratteri, da Google Fonts (link in `index.html`): Cormorant per il nome (in corsivo calligrafico) e per i titoli di sezioni, opere, eventi e video (`--font-display`); Jost per i testi, il menu e le didascalie (`--font-testo`).

**Dopo ogni modifica a `style.css` o `script.js`** cambia il numero di versione `?v=…` nei link in fondo e in cima a `index.html` (ad esempio da `?v=2026-11-04b` a `?v=2026-11-10`). Così chi ha già visitato il sito vede subito la versione nuova invece di quella salvata nel browser.

## Transizioni a pennello

- **Passaggio tra sezioni**: cliccando una voce del menu (o una categoria, o il nome in alto) lo schermo si copre di pennellate, la pagina si sposta sotto il colore e altre pennellate la ripuliscono. È disegnato in `js/script.js`, sezione "2b. Pennellate a tutto schermo".
- **Menu**: su computer il sottomenu "Opere" compare con un colpo di pennello; su telefono il menu scende dall'alto come una pennellata (vedi "Barra del menu" qui sotto).
- **Opere**: cambiando categoria le opere compaiono dipinte una dopo l'altra; nella scheda a tutto schermo ogni opera si dipinge da sinistra (avanti) o da destra (indietro).

Cosa si può cambiare:

- **Colori delle pennellate**: `--pennellata-1` … `--pennellata-4` in cima a `css/style.css`. Ora sono i verdi del fondo del quadro, dal buio alla luce; nel commento lì sopra ci sono altre tavolozze pronte da incollare (Pelle, Riccioli, Inchiostro).
- **Velocità del passaggio**: in `js/script.js` cerca `await anima(` (due righe): i numeri `0.42` e `0.36` sono i secondi di ogni pennellata.
- **Velocità delle comparse**: la variabile `--durata` (in `.rivela` e `.cornice .rivela` nel CSS).
- Chi ha attivato "riduci movimento" nelle impostazioni del telefono o del computer non vede animazioni: il sito salta direttamente alla sezione.

## Effetti

Sono tutti in `js/script.js` (sezione "9. Effetti a tema pittura") e in fondo a `css/style.css` (blocco "EFFETTI A TEMA PITTURA").

- **Sipario d'apertura**: alla prima visita (una volta per sessione del browser) lo schermo è coperto di verde e le pennellate lo puliscono quando le opere sono pronte. Poi il nome compare lettera per lettera e una pennellata verde acido si stende sotto "De Chiara". Per toglierlo, in `index.html` cancella la riga che contiene `sipario-visto` nello script in cima a `<body>`.
- **Acquerello**: muovendo il mouse sull'apertura si lasciano macchie d'acquerello nei colori dei riccioli, che svaniscono in pochi secondi.
- **Cursore da galleria**: un cerchio segue il mouse; sulle opere e sui video diventa un disco con "Guarda", sui link un pallino verde acido.
- **Opere sotto le luci**: con il mouse sopra, le opere si inclinano appena e un riflesso segue il puntatore.
- **Lente**: nella scheda dell'opera, passando sopra l'immagine si vede la pennellata ingrandita due volte e mezzo.
- **Nastro delle categorie**: fascia che scorre sotto l'apertura con tutte le categorie del menu; cliccandone una si va alle opere filtrate.
- **Comparse allo scorrimento**: le linee sopra i titoli si tracciano, le opere si dipingono entrando nello schermo, eventi, contatti e video salgono in sequenza.
- **Dettagli**: filo verde acido nella barra che si allunga mentre si scorre, firma grande nel piè di pagina con "Torna su".

Cursore, acquerello, inclinazione e lente ci sono solo con il mouse: su telefono e tablet non compaiono.

## Effetti della tela

Sono in `js/script.js` (sezione "9b. Effetti della tela") e in `css/style.css` (blocco "EFFETTI DELLA TELA").

- **Tela sul fondo**: tutto il sito, la scheda dell'opera e "Provalo nella tua stanza" stanno su una tela di lino preparata, appena visibile. È il file `css/tela.webp`, ripetuto come una piastrella. Per un fondo liscio, in `css/style.css` cerca `tela.webp` dentro `body` e cancella le tre righe `background-image`, `background-size` e `background-blend-mode`.
- **Titoli dipinti**: il titolo di ogni sezione entra come un disegno a matita (solo il contorno) e poi il colore lo riempie con una pennellata. Dietro, una pennellata del colore della sezione si allunga mentre scorri verso il titolo. I colori delle sezioni sono in cima al blocco: `#opere`, `#processo`, `#eventi`, `#contatti` con `--pigmento-sezione`.
- **Alone dell'opera**: passando col mouse su un'opera, dietro di lei si accende una luce nei suoi stessi colori, come l'alone verde dell'apertura. Sul telefono si accende l'opera che passa al centro dello schermo. Il colore viene calcolato dalla foto; per le opere quasi senza colore (bianco e nero, bronzo, marmo) l'alone è verde acido.
- **Pennellate tra le sezioni**: nello spazio tra una sezione e l'altra compare una grande pennellata leggera del colore della sezione che arriva, che scorre più piano della pagina. Colori, lato e inclinazione sono nell'elenco `COLPI_SFONDO` in `js/script.js`.
- **Profondità nell'apertura**: scorrendo, il nome sale un po' più in fretta e svanisce piano, mentre l'opera in evidenza resta indietro, come su due piani diversi.

## Barra del menu

- **Pennellata**: in cima alla pagina la barra è trasparente. Appena scorri, una pennellata verde notte si stende da sinistra dietro il nome e le voci, con le setole agli estremi, e il testo diventa chiaro una voce dopo l'altra; tornando in cima si ritira. Dentro la pennellata un filo verde acido si allunga mentre scorri la pagina. Il colore è `--fascia` in cima a `css/style.css`; la forma è la variabile `--banda`.
- **Macchia di colore**: su computer, passando col mouse sulle voci, una macchia di pigmento scivola sotto la voce (si schiaccia un po' mentre si sposta, come colore trascinato) e poi resta sulla sezione che stai guardando. Ogni voce ha il suo pigmento (`--pigmento` in `index.html`).
- **Firma**: sotto il nome c'è un ghirigoro che si disegna all'apertura e si ridisegna al passaggio del mouse.
- **Tavolozza**: il sottomenu "Opere" ha la forma di una tavolozza, con un campione di colore per ogni categoria e il foro per il pollice.
- **Social**: su schermi larghi, in fondo alla barra, le icone di Instagram e TikTok (il primo profilo di ciascuno, preso da `contenuti/sito.json`).
- **Telefono**: il pulsante è fatto di tre pennellate che diventano una X. Il menu copre tutto lo schermo su un fondo verde notte con la luce acida del quadro: voci grandi numerate, ognuna sottolineata col suo pigmento, le categorie come etichette colorate e, in fondo, l'email e tutti i social.

## Provalo nella tua stanza

Nella scheda di ogni quadro e stampa, accanto a "Chiedi informazioni", c'è il pulsante **Provalo nella tua stanza**. Il visitatore:

1. carica la foto di una parete (dal telefono può scattarla al momento) oppure usa la **stanza di esempio**;
2. trascina l'opera dove vuole e ne regola la dimensione con il cursore o con il cerchio nell'angolo (da tastiera: frecce per spostare, + e − per la dimensione);
3. sceglie la cornice: nessuna, nera, bianca con passepartout, legno;
4. con **Metti in scala** appoggia un righello su qualcosa di cui conosce la misura (un divano, una porta) e scrive quanto è lungo: l'opera prende le sue misure reali. Nella stanza di esempio la scala è già impostata, perché il divano è largo 220 cm;
5. con **Salva l'immagine** scarica la foto con l'opera appesa, da tenere o mandare a qualcuno.

La foto resta nel browser del visitatore: non viene caricata da nessuna parte.

Perché la messa in scala funzioni, nel pannello il campo **Misure** dell'opera deve essere scritto come altezza × base, ad esempio `70 × 50 cm`. Senza misure il pulsante resta, ma la dimensione si regola solo a occhio. Le categorie che mostrano il pulsante sono in `js/script.js`, nella riga `CATEGORIE_DA_PARETE`.

## Dominio personale

Quando vorrai un indirizzo come `marcodechiara.it`, lo compri da un registrar e lo colleghi in **Settings → Pages → Custom domain** del repository.
