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
├── js/su-misura.js     "Proponi la tua opera": bozzetto, atelier, PDF
├── js/mostra.js        la mostra immersiva: inchiostro fluido, sale, corridoio
├── js/lib/             jsPDF e i caratteri per il PDF (non toccarli)
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

Consigli per le foto: JPG o WebP, circa 1600–2000 px sul lato lungo, sotto i 2 MB (il pannello rifiuta i file più pesanti con l'errore 413; l'ideale per la velocità del sito è sotto i 500 KB), con luce diffusa e sfondo neutro. Verticali, orizzontali e quadrate convivono senza problemi. Se una foto non viene trovata, al suo posto il sito mostra un riquadro tratteggiato con il percorso cercato.

## Processo creativo (video)

Nel pannello, la voce **Processo creativo** è un elenco di video. Per ognuno:

- **Titolo** e **Data**: i video più recenti compaiono per primi.
- **Video caricato** oppure **Oppure link al video**, uno dei due:
  - un file MP4 girato col telefono si guarda direttamente nel sito. Dal pannello passano solo video brevi, sotto i 3 MB: per quelli più pesanti (fino a 25 MB) apri la cartella `video` su GitHub, **Add file → Upload files**, e poi nel pannello sceglili dalla libreria dei video. I file `.mov` dell'iPhone a volte non partono su Chrome: in quel caso convertili in MP4 (ad esempio con HandBrake, gratuito) oppure usa un link.
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

## La mostra immersiva

Il sito è un percorso tra sale, come una mostra. Tutto quello che riguarda l'aspetto sta nel blocco **MOSTRA IMMERSIVA** in fondo a `css/style.css` e in `js/mostra.js`.

- **Ingresso**: a tutto schermo, su fondo nero, un inchiostro fluido nei colori dei quadri (verde acido, arancio, magenta, cobalto, giallo, turchese). All'arrivo esplode dal centro, poi continua a muoversi da solo; il mouse (o il dito) lo mescola, un tocco fa nascere una macchia nuova. Sopra, il nome gigante sale lettera per lettera, e il cerchio verde acido "Entra nella mostra" porta alla prima sala. È una piccola simulazione di fluido sulla scheda grafica (WebGL): si ferma quando l'ingresso non si vede. Su browser senza WebGL, e per chi ha attivato "riduci movimento", resta una composizione ferma di sfumature colorate. I colori sono in `COLORI_FLUIDO` in `js/mostra.js`.
- **Sale di colore**: a ogni sezione cambia il colore di tutta la pagina, della barra in alto e perfino della barra del browser sul telefono. Ingresso nero, **Sala 01 La mostra** verde acido, **Sala 02 Opere** (il catalogo) carta, **Sala 03 Processo** giallo, **Sala 04 Eventi** magenta, **Sala 05 Su misura** arancio, **Uscita** (contatti e piè di pagina) nero. I colori sono le variabili `--notte`, `--carta`, `--acido`, `--giallo`, `--magenta`, `--arancio` all'inizio del blocco, e sotto le righe `html[data-sala="…"]` dicono quale colore va a quale sala (fondo, testo e testo secondario).
- **La mostra (il corridoio)**: su computer e tablet la sala resta ferma mentre scorri e le opere passano di lato, come camminando lungo una parete; quella al centro si gira verso di te, le altre ruotano appena. In basso il numero dell'opera e una barra di avanzamento; dietro, la parola "Mostra" gigante scorre più piano. Alla fine un cerchio porta al catalogo completo. Sul telefono (e con "riduci movimento") le opere si sfogliano col dito. **Quali opere**: quelle con **In mostra** attivo nel pannello (se sono almeno tre), altrimenti le prime dodici dell'elenco.
- **Titoli giganti**: i titoli delle sale (Instrument Serif, enormi) salgono lettera per lettera da sotto una linea e, scorrendo, scivolano piano di lato. Sopra ogni titolo il numero della sala.
- **Grana**: sopra tutto una grana leggera da pellicola, che su computer si muove. Per toglierla cancella la riga `<div class="grana" …>` in `index.html`.
- **Cursore**: un cerchio che inverte i colori di quello che c'è sotto; sulle opere diventa un disco con "Guarda".
- **Barra in alto**: trasparente sull'ingresso; scorrendo prende il colore della sala, sfumato e un po' trasparente. Le voci in maiuscoletto si sottolineano passando col mouse e sulla sala in cui sei.

## Cambiare colori e caratteri

- **Colori delle sale**: vedi sopra, nel blocco MOSTRA IMMERSIVA.
- **Colori delle finestre** (scheda dell'opera, "Provalo nella tua stanza", atelier): `--parete` (fondo), `--inchiostro` (testo) e `--grafite` (testo secondario), sempre nel blocco MOSTRA IMMERSIVA.
- **Caratteri**, da Google Fonts (link in `index.html`): Instrument Serif per il nome, i titoli delle sale, delle opere e degli eventi (`--font-display`); Manrope per i testi, il menu e le didascalie (`--font-testo`). Le stesse due famiglie sono in `js/lib/font` per il PDF della proposta.

**Dopo ogni modifica a `style.css` o ai file `.js`** cambia il numero di versione `?v=…` nei link in fondo e in cima a `index.html` (ad esempio da `?v=2026-11-08b` a `?v=2026-11-10`). Così chi ha già visitato il sito vede subito la versione nuova invece di quella salvata nel browser.

## Transizioni a pennello

- **Passaggio tra sezioni**: cliccando una voce del menu (o una categoria, o il nome in alto) lo schermo si copre di pennellate, la pagina si sposta sotto il colore e altre pennellate la ripuliscono. È disegnato in `js/script.js`, sezione "2b. Pennellate a tutto schermo".
- **Menu**: su computer il sottomenu "Opere" compare con un colpo di pennello; su telefono il menu scende dall'alto come una pennellata (vedi "Barra del menu" qui sotto).
- **Opere**: cambiando categoria le opere compaiono dipinte una dopo l'altra; nella scheda a tutto schermo ogni opera si dipinge da sinistra (avanti) o da destra (indietro).

Cosa si può cambiare:

- **Colori delle pennellate**: `--pennellata-1` … `--pennellata-4` nel blocco MOSTRA IMMERSIVA in fondo a `css/style.css`: ora tre neri e l'ultima verde acido.
- **Velocità del passaggio**: in `js/script.js` cerca `await anima(` (due righe): i numeri `0.42` e `0.36` sono i secondi di ogni pennellata.
- **Velocità delle comparse**: la variabile `--durata` (in `.rivela` e `.cornice .rivela` nel CSS).
- Chi ha attivato "riduci movimento" nelle impostazioni del telefono o del computer non vede animazioni: il sito salta direttamente alla sezione.

## Effetti

- **Cursore**: vedi "La mostra immersiva".
- **Opere sotto le luci**: con il mouse sopra, le opere si inclinano appena e un riflesso segue il puntatore; nel catalogo dietro l'opera si accende una luce nei suoi stessi colori (sul telefono quella al centro dello schermo).
- **Lente**: nella scheda dell'opera, passando sopra l'immagine si vede la pennellata ingrandita due volte e mezzo.
- **Comparse allo scorrimento**: le linee sopra i titoli si tracciano, le opere del catalogo si dipingono entrando nello schermo, eventi, contatti e video salgono in sequenza.
- **Menu del telefono**: il pulsante "Menu" apre un fondo nero a tutto schermo con le voci grandi in Instrument Serif, numerate, le categorie come etichette colorate e in fondo l'email e i social.

Cursore, inclinazione e lente ci sono solo con il mouse: su telefono e tablet non compaiono.

## Mi piace e visualizzazioni

Sotto ogni opera (e nella scheda a tutto schermo) c'è un cuore. Toccandolo si riempie di magenta e schizza gocce di colore; nella scheda basta anche un doppio clic sull'opera.

**Senza fare niente** ogni visitatore ritrova i suoi cuori quando torna sul sito (li ricorda il suo browser), ma non vede quanti ne hanno messi gli altri.

**Con Firebase collegato** (un piccolo database gratuito di Google) il sito conta:
- i **mi piace** di tutti, con il numero accanto al cuore;
- le **visualizzazioni** di ogni opera, con un occhio accanto al cuore e nella scheda. Una visualizzazione è l'apertura della scheda dell'opera; chi la riapre nella stessa visita non viene contato due volte.

Si attiva una volta sola, in circa dieci minuti:

1. Vai su [console.firebase.google.com](https://console.firebase.google.com), entra con un account Google e crea un nuovo progetto (per esempio `marco-de-chiara`). Google Analytics non serve: puoi disattivarlo.
2. Nel menu a sinistra apri **Databases & Storage → Firestore** e premi **Crea database**. Se chiede l'edizione scegli **Standard**, poi una località in Europa (per esempio `eur3`) e la **modalità di produzione**.
3. Apri la scheda **Regole**, cancella quello che c'è, incolla queste righe e premi **Pubblica**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /like/{opera} {
         allow read: if true;
         allow create: if opera.matches('^[a-z0-9-]{1,80}$')
                       && request.resource.data.keys().hasOnly(['n'])
                       && request.resource.data.n == 1;
         allow update: if request.resource.data.keys().hasOnly(['n'])
                       && request.resource.data.n is int
                       && request.resource.data.n >= 0
                       && (request.resource.data.n == resource.data.n + 1
                           || request.resource.data.n == resource.data.n - 1);
         allow delete: if false;
       }
       match /visite/{opera} {
         allow read: if true;
         allow create: if opera.matches('^[a-z0-9-]{1,80}$')
                       && request.resource.data.keys().hasOnly(['n'])
                       && request.resource.data.n == 1;
         allow update: if request.resource.data.keys().hasOnly(['n'])
                       && request.resource.data.n == resource.data.n + 1;
         allow delete: if false;
       }
     }
   }
   ```

   Queste regole permettono solo di aggiungere o togliere un "mi piace" alla volta e di aggiungere una visualizzazione alla volta: nessuno può cancellare i conteggi o scriverci altro.
4. Premi l'ingranaggio in alto a sinistra → **Impostazioni progetto**. In fondo, sotto "Le tue app", premi l'icona **</>** (Web), dai un nome qualsiasi e registra l'app. Firebase mostra un blocco di codice: ti servono solo due valori, `projectId` e `apiKey`.
5. Su [app.pagescms.org](https://app.pagescms.org) apri **Presentazione e contatti**, incolla `projectId` in "Mi piace: ID del progetto Firebase" e `apiKey` in "Mi piace: chiave web Firebase" (senza virgolette), poi salva.

Dopo un paio di minuti accanto ai cuori compaiono i numeri. I conteggi si vedono anche dalla console di Firebase, in Firestore Database → scheda Dati: la raccolta `like` per i mi piace e `visite` per le visualizzazioni, con un documento per opera e il totale nel campo `n`. Le visualizzazioni compaiono sul sito solo dalla prima apertura in poi: un'opera mai aperta non mostra l'occhio.

Da sapere:
- Il piano gratuito di Firebase basta per migliaia di visite al giorno e non chiede la carta di credito.
- La `apiKey` è fatta per stare in un sito pubblico: a proteggere i dati sono le regole del passo 3.
- Ogni opera è riconosciuta dal suo titolo: se Marco cambia il titolo di un'opera, i suoi conteggi ripartono da zero.
- Sono conteggi semplici, non un sistema anti-imbroglio: chi svuota i dati del browser può rimettere il cuore, e anche le visite di Marco contano. Per un sito d'artista va benissimo.

## Provalo nella tua stanza

Nella scheda di ogni quadro e stampa, accanto a "Chiedi informazioni", c'è il pulsante **Provalo nella tua stanza**. Il visitatore:

1. carica la foto di una parete (dal telefono può scattarla al momento) oppure usa la **stanza di esempio**;
2. trascina l'opera dove vuole e ne regola la dimensione con il cursore o con il cerchio nell'angolo (da tastiera: frecce per spostare, + e − per la dimensione);
3. sceglie la cornice: nessuna, nera, bianca con passepartout, legno;
4. con **Metti in scala** appoggia un righello su qualcosa di cui conosce la misura (un divano, una porta) e scrive quanto è lungo: l'opera prende le sue misure reali. Nella stanza di esempio la scala è già impostata, perché il divano è largo 220 cm;
5. con **Salva l'immagine** scarica la foto con l'opera appesa, da tenere o mandare a qualcuno.

La foto resta nel browser del visitatore: non viene caricata da nessuna parte.

Perché la messa in scala funzioni, nel pannello il campo **Misure** dell'opera deve contenere le due misure, ad esempio `50 × 70 cm`: l'ordine non importa, il sito capisce dalla foto se l'opera è verticale o orizzontale. Senza misure il pulsante resta, ma la dimensione si regola solo a occhio. Le categorie che mostrano il pulsante sono in `js/script.js`, nella riga `CATEGORIE_DA_PARETE`.

## Su misura: "Proponi la tua opera"

Tra Eventi e Contatti c'è la sezione **Su misura** (anche nel menu). A destra una tela si dipinge da sola, pennellata dopo pennellata, con un bozzetto dopo l'altro: un paesaggio, un astratto, una natura morta… Il bottone **Proponi la tua opera** apre l'atelier, a tutto schermo, dove il visitatore compone la sua opera in otto passi:

1. **Opera**: quadro, scultura, incisione, stampa, disegno o altro (scritto da lui);
2. **Tecnica**: cambia secondo il tipo (olio, acrilico, foglia d'oro… bronzo, gesso… xilografia, linoleografia…), più "Scegli tu" e "Altro";
3. **Misure**: orientamento e formato (piccolo, medio, grande, molto grande) oppure misure scritte da lui;
4. **Stile e soggetto**: natura morta, realismo, astratto, soggetti umani, ritratto, paesaggio, surreale, materico o altro; l'atmosfera (serena, intensa, malinconica, energica, misteriosa, luminosa) e un campo per raccontare l'idea;
5. **Colori**: otto tavolozze pronte (la prima è quella delle opere di Marco) e i suoi colori, da cambiare toccandoli; il tono generale chiaro, medio o scuro;
6. **Dettagli**: dove andrà, cornice, budget indicativo, tempi (anche una data precisa) e fino a quattro immagini di ispirazione;
7. **Contatti**: nome ed email (obbligatori), telefono, città, note e il consenso;
8. **Proposta**: il riepilogo, con "Modifica" per tornare a ogni passo.

Mentre sceglie, a sinistra (sul telefono in alto) il sito **dipinge un bozzetto** dell'opera, con le proporzioni giuste, i colori, lo stile e l'atmosfera scelti; le incisioni diventano righe d'inchiostro come una xilografia, i disegni tratteggio a matita, le sculture una forma su un piedistallo nel materiale scelto. "Un'altra idea" ne dipinge un'altra variante. **In scala** mostra l'opera su una parete accanto a una persona alta 170 cm (e a un divano, per i quadri).

Alla fine **Crea la proposta in PDF** prepara una scheda elegante (la fascia col nome di Marco, il bozzetto in cornice, la tavolozza con i nomi dei colori, la vista in scala, tutte le scelte, l'idea, le note e le immagini di ispirazione) e:

- sul computer la scarica e apre l'email per Marco già scritta, con l'oggetto, il riepilogo e il suo indirizzo (quello di `contenuti/sito.json`): basta allegare il PDF e inviare;
- sul telefono offre **Invia il PDF…**, che apre la condivisione (Mail, WhatsApp…), oltre ad aprire l'email o scaricare il file.

Niente viene caricato o inviato da nessuna parte: il PDF si crea nel browser del visitatore. Le scelte restano salvate nel suo browser come bozza, così se chiude e riapre ritrova tutto (tranne le immagini e il consenso).

Altri modi per aprire l'atelier:

- nella scheda di ogni opera, il link **Vorresti qualcosa di simile? Proponi un'opera su misura** apre l'atelier già con tipo, tecnica, misure e **i colori presi dalla foto** di quell'opera, che finisce anche nel PDF;
- il link diretto **`indirizzo-del-sito/#proponi`** (ad esempio `https://domenico-tr.github.io/marco-de-chiara/#proponi`) apre subito l'atelier: comodo da mettere nella bio di Instagram o in un messaggio.

Testi, tecniche, formati e tavolozze sono in cima alla parte "Le scelte possibili" di `js/su-misura.js` (`TECNICHE`, `FORMATI`, `TAVOLOZZE`, `BUDGET`…). La cartella `js/lib` contiene jsPDF (licenza MIT) e i caratteri Instrument Serif e Manrope per il PDF (licenza SIL Open Font License): si scaricano solo quando un visitatore crea il PDF.

## Bottoni e firma

- **Bottoni a pennello**: passando col mouse, una pennellata verde acido attraversa il bottone da sinistra.
- **Firma nel piè di pagina**: il nome gigante entra come un disegno a contorno e poi il colore lo riempie, con un tratto verde acido sotto.

Del vecchio aspetto "a pennello" non ci sono più l'apertura con l'opera in cornice, il nastro delle categorie, il sipario della prima visita, le macchie d'acquerello e le pennellate di fondo tra le sezioni: il codice è ancora in `js/script.js`, ma non compare perché nella pagina mancano i loro elementi.

## Dominio personale

Quando vorrai un indirizzo come `marcodechiara.it`, lo compri da un registrar e lo colleghi in **Settings → Pages → Custom domain** del repository.
