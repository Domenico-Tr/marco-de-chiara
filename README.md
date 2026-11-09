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
├── js/mostra.js        la galleria notturna: muro, luci, lanterna, sala 3D, ingresso e passaggi
├── marchio/            l'icona del sito (dal logo MDC Art Studio)
├── img/scontornate/    le foto delle sculture senza sfondo, per la galleria
├── modelli/            i modelli 3D delle sculture (.glb), caricati dal pannello
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
- **In mostra**: le opere con "In mostra" attivo vanno per prime nel loro corridoio della galleria (Quadri, Stampe o Sculture).
- **Sculture**: due campi in più, facoltativi: **Foto scontornata** e **Modello 3D** (vedi "Le sculture sui piedistalli" più sotto).
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

Le icone di email, Instagram e TikTok sono disegnate direttamente nel sito (in `js/script.js`, `ICONE`): niente librerie da scaricare, così la pagina parte prima.

## La galleria notturna

Il sito è una galleria visitata di notte: al buio, con le luci colorate delle sale sul fondo e una lanterna che segue chi visita. Tutto quello che riguarda l'aspetto sta nel blocco **GALLERIA NOTTURNA** in fondo a `css/style.css` e in `js/mostra.js`.

- **Ingresso, il muro al buio**: sulla parete dell'ingresso sono appese alcune opere (prima i quadri), che al buio si vedono appena. La luce del mouse o del dito le scopre una alla volta e sotto quella illuminata compare il cartellino con titolo e anno; con il mouse un clic sull'opera illuminata la apre. Muovendo la luce le opere si spostano un poco, quelle vicine più di quelle lontane, e scorrendo restano indietro come su pareti a profondità diverse. All'arrivo la luce passa da sola sulle opere finché il visitatore non la muove. Dall'alto scendono tre fasci di luce. Il nome gigante sale lettera per lettera, e il cerchio luminoso "Entra nella galleria" porta alla prima sala. Dove appendere le opere: `POSTI_LARGO` (computer) e `POSTI_STRETTO` (telefono) in `js/mostra.js`, una riga per opera: posizione orizzontale e verticale in percentuale, altezza e larghezza massime, profondità (1 vicina, 3 lontana).
- **La lanterna**: dove passa il mouse (o il dito) c'è luce, intorno è più buio. Le lettere del nome e dei titoli delle sale si scaldano e brillano quando la luce passa vicino. Sul telefono, se non la tocchi, la luce vaga piano da sola sulle opere dell'ingresso. Nella luce galleggia la polvere. Quanto è buio lontano dalla lanterna: in `.galleria-notturna .lanterna`, l'ultimo numero di `rgba(5, 6, 8, 0.34)` (0 = niente buio); quanto è buio il muro dell'ingresso: in `.ingresso-buio`.
- **Le luci delle sale (mai un colore pieno)**: il fondo è un muro d'intonaco al buio, illuminato da due o tre luci colorate che respirano e si spostano piano. Ogni sala ha le sue: **Ingresso** cobalto e verde acido, **Sala 01 La galleria** ambra calda e viola, **Sala 02 Opere** luce bianca calda e un blu freddo, **Sala 03 Processo** azzurro da proiettore, **Sala 04 Eventi** neon magenta e arancio, **Sala 05 Su misura** la lampada arancio, **Uscita** verde come l'insegna di un'uscita. Passando da una sala all'altra le luci cambiano colore piano piano (anche la barra del browser sul telefono). Si cambiano nelle righe `html[data-sala="…"]` all'inizio del blocco: `--luce-a`, `--luce-b`, `--luce-c` sono le tre luci, `--bagliore` il colore del bagliore delle lettere.
- **Sala 01, la porta**: anche scorrendo, la galleria resta chiusa da una porta: un portale di pietra con la chiave di volta **MDC**, la lunetta di vetro accesa da dentro, due applique, il cordone di velluto rosso tra le colonnine d'ottone, e due battenti di legno con i vetri, le maniglie e la luce che filtra da sotto e dalla fessura. Ogni tanto un filo d'aria la socchiude; col mouse sopra si apre un poco. Toccandola (o cliccandola, o con Invio) il cordone si sgancia, i battenti girano sui cardini, dentro si vede la sala illuminata e ci si entra. Quando si esce dalla galleria (scorrendo oltre o andando in un'altra sala) la porta si richiude: ogni volta che si torna bisogna entrare di nuovo.
- **Il bivio e i tre corridoi**: dietro la porta ci sono tre archi: **Quadri**, **Stampe** e **Sculture**, ognuno con dentro la prima opera del corridoio e quante opere contiene. Se una categoria non ha opere, il suo arco non c'è. Scelto un corridoio, gli altri archi scivolano via, dentro l'arco scelto compare il corridoio vero e l'arco si allarga fino a diventare la sala, mentre si fa un passo avanti. Poi, scorrendo, si cammina dentro una sala buia tra le opere a zig-zag, ognuna con il suo faretto, la pozza di luce sul pavimento lucido e il riflesso. Le opere lontane restano nell'ombra e si accendono avvicinandosi. Col mouse ci si guarda intorno. Sotto il titolo i pulsanti Quadri, Stampe, Sculture e Bivio per cambiare corridoio in ogni momento; in fondo al corridoio una parete con **il corridoio successivo**, **Torna al bivio** e **tutte le opere della categoria nel catalogo**. In ogni corridoio entrano fino a venti opere: prima quelle con **In mostra** attivo nel pannello, poi le altre nell'ordine dell'elenco. Con "riduci movimento" ogni corridoio diventa una fila di opere da sfogliare.
- **Le sculture sui piedistalli**: nel corridoio delle sculture ogni opera sta su un piedistallo bianco (un vero parallelepipedo in 3D) con la targhetta sul davanti. Se la scultura ha la **Foto scontornata** (senza sfondo, campo nel pannello), diventa un oggetto con spessore che gira piano su sé stessa quando ti avvicini e si fa girare trascinandola di lato col dito o col mouse. Senza foto scontornata la scultura sta in una teca di vetro; senza nessuna foto (come *Onore*, per ora) è coperta da un telo, "in allestimento". Le foto scontornate di *Face* e *Kore* sono già pronte in `img/scontornate/` (il sito le trova da solo, perché hanno lo stesso nome della foto). Per le nuove sculture: carica la foto senza sfondo nel campo **Foto scontornata** (sull'iPhone basta tenere premuto sul soggetto nell'app Foto e scegliere "Copia" o "Condividi"; altrimenti remove.bg).
- **Il modello 3D vero**: un modello 3D non si può ricavare da una sola foto, ma si fa in pochi minuti col telefono girando intorno alla scultura con un'app gratuita (**Scaniverse**, **Polycam** o **KIRI Engine**), esportandolo in formato **.glb** e caricandolo nel campo **Modello 3D** della scultura. Sulla targhetta compare il bollino **3D** e, toccando la scultura, si apre a tutto schermo e si gira a 360° col dito (e si ingrandisce con due dita). Il modello viene dalla libreria gratuita `model-viewer` di Google, caricata solo quando serve.
- **La cordicella e le luci accese (tema chiaro)**: in alto a destra pende una cordicella con un pomello. Si tira giù col mouse o col dito (o si tocca, o si preme il tasto **L**): il pomello sfarfalla, la luce si allarga a cerchio partendo dalla cordicella e la galleria diventa **chiara, di giorno**. Muri color avorio con le luci delle sale diventate luce del giorno, il sole che entra da due finestre e si sposta piano sui muri, il pulviscolo dorato, le opere del muro tutte illuminate, la galleria 3D bianca con i lucernari, la scheda dell'opera in una stanza bianca. Col mouse la luce viene dal puntatore: quadri, biglietti e titoli gettano l'ombra dalla parte opposta e l'ombra si sposta mentre muovi il mouse. Tirando di nuovo torna la notte. Il browser si ricorda la scelta. I colori di giorno sono nel blocco **AUDIOGUIDA, CORDICELLA E LUCI ACCESE** in fondo a `css/style.css` (righe `html.luci-accese`).
- **L'audioguida (il menu)**: una capsula in basso, come l'audioguida di un museo, con le sale numerate (00 Ingresso … 06 Contatti); una luce del colore della sala scivola sotto quella in cui sei e segue il mouse, e un filo sottile mostra quanto della visita hai fatto. Passando su **Opere** salgono le categorie. Sul telefono (e sugli schermi stretti) la capsula mostra la sala in cui sei e il pulsante **Pianta**.
- **La pianta della galleria**: dal pulsante Pianta (o col tasto **M**) sale dal basso la pianta delle sale, disegnata con muri e porte, con il puntino "Sei qui" nella sala in cui ti trovi; sotto le categorie delle opere, l'email e i social. Si chiude con Chiudi, con Esc, toccando fuori o trascinandola giù. Le sale vuote (per esempio Processo senza video) compaiono tratteggiate, "in allestimento".
- **La scheda dell'opera**: si apre in una stanza buia, con una luce calda sul quadro.
- **Titoli giganti**: i titoli delle sale salgono lettera per lettera e, scorrendo, scivolano piano di lato. Sopra ogni titolo il numero della sala con un puntino luminoso, e dietro un faretto del colore della sala.
- **Grana**: sopra tutto una grana leggera e ferma da pellicola. Per toglierla cancella la riga `<div class="grana" …>` in `index.html`; per togliere la polvere, la riga `<canvas class="polvere" …>`.
- **Cursore**: un cerchio di luce; sui link diventa un puntino verde acido, sulle opere un disco con "Guarda".
- **In alto**: solo la firma e la cordicella. Scorrendo, dietro la firma compare una sfumatura del colore del muro.
- **Quadri appesi**: le opere del muro dell'ingresso sono appese a un chiodo, un po' storte. Se la luce le sfiora veloce dondolano e piano piano tornano ferme; sul telefono basta toccarle.
- **Calamite**: con il mouse, i bottoni e le voci dell'audioguida si lasciano attirare un poco dal puntatore.
- **Catalogo**: con il mouse sopra un'opera, le altre si abbassano e resta in luce solo quella.
- **Eventi come biglietti**: ogni evento è un biglietto con la linea tratteggiata e le tacche; col mouse si inclina e ci scorre sopra un riflesso. Il pulsante **Aggiungi al calendario** scarica un file che il telefono o il computer aprono nel calendario (dal primo all'ultimo giorno dell'evento, con il luogo e le note).
- **Pennellate nel piede**: in fondo alla pagina, passando il mouse si dipinge nei colori di Marco (sul telefono un tocco lascia una macchia di colore); dopo qualche secondo il colore svanisce.

## Foto leggere

Le foto caricate dal pannello sono quelle del telefono: anche 2 MB l'una, più di 40 MB per tutto il catalogo. Per non far aspettare chi visita, il sito non le scarica così: le chiede a **wsrv.nl**, un servizio gratuito che le rimpicciolisce alla misura che serve (piccole sul muro dell'ingresso e nel catalogo, grandi nella scheda), le trasforma in WebP e le tiene in copia su server in tutto il mondo. Una foto da 2 MB diventa di 60-150 KB, e le opere arrivano dieci volte più in fretta.

- Non c'è niente da fare: il pannello e le foto originali nel repository restano come prima. La prima volta che una foto nuova viene chiesta il servizio la prepara (qualche istante in più), poi è subito pronta per tutti.
- Se il servizio non risponde, il sito se ne accorge da solo e usa le foto originali.
- Quando provi il sito sul computer (indirizzo `localhost`) si usano sempre le originali, perché il servizio non può vedere i file del tuo computer.
- La lente nella scheda dell'opera usa la foto originale, per vedere bene la pennellata.
- Le foto della galleria in 3D partono solo quando ti avvicini all'opera.
- Per spegnere tutto: in `js/script.js` cerca `const MINIATURE` e scrivi `attive: false`.

## Scorrimento fluido sul telefono

Sul telefono alcune cose sono più leggere, perché lo scorrimento resti liscio:
- quando cambi sala le luci si dissolvono su due strati (cambia solo la trasparenza, il telefono non ridisegna tutto lo schermo);
- la lanterna, la polvere e il bagliore delle lettere ci sono solo all'ingresso; i titoli non scivolano di lato;
- nel catalogo le opere compaiono con una dissolvenza invece della pennellata;
- ogni foto tiene il suo spazio prima di arrivare (dalle misure dell'opera, base x altezza), così la pagina non salta mentre le foto si caricano;
- la galleria in 3D non si ricalcola quando la barra degli indirizzi del browser entra o esce.

## Cambiare colori e caratteri

- **Luci delle sale**: vedi sopra, nel blocco GALLERIA NOTTURNA.
- **Colori delle finestre chiare** ("Provalo nella tua stanza", atelier): `--parete` (fondo), `--inchiostro` (testo) e `--grafite` (testo secondario) all'inizio del blocco GALLERIA NOTTURNA. La scheda dell'opera, buia, ha i suoi colori in `.scheda` nello stesso blocco.
- **Caratteri**, da Google Fonts (link in `index.html`): Instrument Serif per il nome, i titoli delle sale, delle opere e degli eventi (`--font-display`); Manrope per i testi, il menu e le didascalie (`--font-testo`). Le stesse due famiglie sono in `js/lib/font` per il PDF della proposta.

**Dopo ogni modifica a `style.css` o ai file `.js`** cambia il numero di versione `?v=…` nei link in fondo e in cima a `index.html` (ad esempio da `?v=2026-11-09a` a `?v=2026-11-10`). Così chi ha già visitato il sito vede subito la versione nuova invece di quella salvata nel browser.

## L'ingresso nella galleria e il logo MDC Art Studio

- **Il logo**: un arco (l'ingresso di una galleria) con la lampada verde acido in cima, il monogramma **MDC** (la D in corsivo) e sotto **ART STUDIO**. I file sono nella cartella `marchio/`: l'icona del sito (`mdc-icona.svg`, la vedi nella scheda del browser e, salvando il sito sulla schermata del telefono, `mdc-icona-180.png`). Le versioni complete del logo (chiaro, scuro, per il profilo dei social) sono a parte, per usarle dove vuoi.
- **L'ingresso**: la prima volta che si apre il sito (una volta per visita) lo schermo è buio: l'arco del logo si disegna, la lampada si accende, arrivano le lettere MDC e ART STUDIO si allarga. Poi l'arco diventa una porta: tra le ante passa una lama di luce, le ante si aprono, la luce calda invade lo schermo e si entra nella galleria, mentre il nome di Marco sale lettera per lettera. Dura circa 4 secondi; un clic, un tocco, la rotella o un tasto lo saltano. Non compare se l'indirizzo porta già a una sala (per esempio `…/#eventi`) né per chi ha attivato "riduci movimento". È tutto in `index.html` (il disegno, in fondo allo script in cima alla pagina), nel blocco **L'INGRESSO NELLA GALLERIA E I PASSAGGI TRA LE SALE** in fondo a `css/style.css` e in `js/mostra.js` (sezione 6e).

## I passaggi tra le sale

Quando scegli una sala dall'audioguida, dalla pianta o da un link della pagina, non si salta: si entra nella sala nuova, e ogni sala ha la sua entrata. Mentre lo schermo è coperto compare il cartello con il numero e il nome della sala.

- **00 Ingresso**: due porte di legno con le maniglie d'ottone si chiudono e si riaprono sulla luce.
- **01 La galleria**: un varco: il buio si stringe, poi una porta si allarga fino a diventare la sala.
- **02 Opere**: il sipario di velluto rosso si chiude e si apre raccogliendosi ai lati.
- **03 Processo**: si accende il proiettore e lo schermo si allarga.
- **04 Eventi**: scende la serranda, l'insegna al neon sfarfalla, la serranda risale.
- **05 Su misura**: la lampada dell'atelier oscilla e la sua luce si allarga.
- **06 Contatti**: le porte scorrevoli dell'uscita, con l'insegna verde.

Con le luci accese porte e varco diventano chiari. Chi ha attivato "riduci movimento" va direttamente alla sala. Le entrate sono in `js/mostra.js`, sezione 6f (`ENTRATE` dice quale entrata ha ogni sala); colori e forme nel blocco in fondo a `css/style.css`.

## Effetti

- **Cursore**: vedi "La galleria notturna".
- **Opere sotto le luci**: con il mouse sopra, le opere si inclinano appena e un riflesso segue il puntatore; nel catalogo dietro l'opera si accende una luce nei suoi stessi colori (sul telefono quella al centro dello schermo).
- **Lente**: nella scheda dell'opera, passando sopra l'immagine si vede la pennellata ingrandita due volte e mezzo.
- **Comparse allo scorrimento**: le linee sopra i titoli si tracciano, le opere del catalogo si dipingono entrando nello schermo, eventi, contatti e video salgono in sequenza.

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
