# Leandro Style / Studio

Questa proposta usa il gestionale esistente come base. Non promette ricavi: il pilota misura se il prodotto elimina lavoro e viene usato davvero.

## Cosa provare

`VITE_STUDIO_DEMO_ONLY=true npm run dev` apre una demo isolata; `/demo` la apre anche nella build normale. I dati di esempio sono locali al browser. Non sono account, prezzi o appuntamenti del salone reale. La demo non invia notifiche né messaggi e non incassa pagamenti.

Agenda giornaliera per professionista, apertura del dettaglio, modifica/creazione/cancellazione/completamento, controllo delle sovrapposizioni e della pausa. Prenotazione cliente con disponibilità calcolata dallo stesso controllo. Schede clienti con note e storico, listino modificabile, calendario ICS, backup JSON validato. Modificare la durata di un servizio viene rifiutato se genera conflitti sugli appuntamenti esistenti.

L'agenda dimostrativa usa 09–13 e 14–19, tre professionisti e listino illustrativo. Valore in agenda significa somma dei prezzi dei servizi, non fatturato o incasso. Il gestionale Appwrite conserva la propria configurazione e le sue regole di disponibilità.

Il layout amministratore reale riceve navigazione laterale su desktop, navigazione compatta su mobile, accesso al Team e una dashboard più sobria. La dashboard può caricarsi anche senza operatori e presenta errore/retry. Non è stata verificata con credenziali Appwrite di produzione.

## Direzione visiva

Agenda al centro, fondo chiaro caldo, testi diretti e dimensioni leggibili. La navigazione principale contiene Recupera, Agenda, Clienti e Listino. Il percorso Recupera è la nuova schermata iniziale. Lista d’attesa dall’agenda e backup nelle opzioni secondarie. Rimossi slogan, sidebar da dashboard, KPI iniziali e pannello decorativo della prenotazione cliente. Una sola azione principale per schermata.

Motion discreto per pannelli e spostamenti, con rispetto di `prefers-reduced-motion`. Il logo originale rimane. L’interfaccia punta al lavoro quotidiano del salone, evitando messaggi promozionali nel gestionale.

## Come proporlo a Leandro

Presentare un caso concreto: «Quando ti cancellano un colore all’ultimo momento, quanto tempo impieghi a cercare qualcuno che possa venire?». Mostrare il buco di 90 minuti, confrontare un colore con taglio e piega, preparare un invito, registrare una sola conferma e mostrare l’agenda aggiornata. Dichiarare subito che il prototipo usa disponibilità di esempio e non invia messaggi. Il valore di listino non è un incasso recuperato.

**Pilota di 30 giorni, dopo integrazione del backend:** un salone e un referente. Registrare numero di cancellazioni, minuti liberati, persone contattate, tempo impiegato e servizi effettivamente svolti. Confrontare con la gestione abituale; distinguere prenotato, svolto e incassato. Raccogliere anche proposte rifiutate e motivi. Il pilota deve verificare se il sistema fa risparmiare lavoro e aiuta a recuperare appuntamenti; nessuna promessa di incremento del fatturato. Non chiedere al salone di migrare tutta l’agenda prima di aver dimostrato il vantaggio su questo flusso.

**Prezzo da testare, non validato dal mercato:** 290 € per configurazione/pilota e 59 €/mese per assistenza e utilizzo dopo il collaudo. Infrastruttura, messaggi a consumo, personalizzazioni e IVA ove dovuta vanno definiti separatamente. Non vendere ancora come SaaS multisalone: isolamento dati, billing, onboarding e supporto devono essere costruiti e verificati prima.

Dopo il pilota raccogliere una testimonianza autorizzata con un risultato misurato. Mostrare il caso studio a cinque saloni della stessa fascia, tramite presentazioni personali e una demo con il loro brand. Non spedire campagne automatiche prima di avere un'offerta validata. I contenuti social devono mostrare una vera sequenza di prenotazione o di lavoro, non immagini generiche e frasi promozionali.

## Prima di un avvio reale

Verificare autenticazione e permessi Appwrite con account admin/cliente, controlli server contro prenotazioni concorrenti, gestione degli orari reali, backup e ripristino, notifiche e deduplicazione dei promemoria. Pagamenti, acconti, riattivazione automatica e inviti con conferma online sono sviluppi successivi. Lista d’attesa e recupero sono presenti soltanto nella demo locale.

## Verifica

`node --test src/studio/model.test.mjs` controlla conflitti, adiacenza, pausa, chiusura, cancellazione, disponibilità, backup e ICS. `VITE_STUDIO_DEMO_ONLY=true npm run build` crea l'anteprima senza service worker. `npm run build` conserva la PWA del gestionale. La demo è un percorso di frontend locale, non una prova end-to-end del backend.

## Versione 2 — uso quotidiano

Agenda su telefono con un solo professionista, selettore rapido e lista giornaliera. Spazi liberi cliccabili, evidenza del prossimo appuntamento, trascinamento su desktop con controllo dei conflitti e annullamento dell’ultima modifica. La conferma cliente è registrata manualmente dal salone; nessun messaggio viene spedito. Il comando per il prossimo appuntamento apre una proposta a quattro settimane, da controllare e salvare.

Lista d’attesa locale: richieste per cliente/servizio, intervallo di date, professionista o chiunque, fascia oraria. Le disponibilità devono contenere l’intera durata; pausa e appuntamenti già presenti vengono esclusi. L’operatore sceglie uno slot e inserisce l’appuntamento, rimuovendo la richiesta. L’annullamento ripristina appuntamento e richiesta insieme.

Schede cliente con telefono facoltativo, preferenze, formula colore, storico e fino a tre foto ottimizzate. Il caricamento richiede la conferma dell’autorizzazione del cliente. Modifiche salvate localmente e incluse nel backup; scheda raggiungibile dal dettaglio senza perdere la bozza dell’appuntamento. I backup precedenti restano compatibili.

Queste nuove funzioni sono nella demo Studio e non scrivono nel database Appwrite. Collegamento persistente multisessione, promemoria e comunicazioni richiedono un successivo intervento sul backend.

## Recupero cancellazioni — prototipo operativo

Il caso di esempio annulla un colore e inserisce tre richieste locali con disponibilità esplicita. Il motore confronta sequenze fino a tre servizi nello spazio annullato; l’interfaccia mostra al massimo due alternative. Priorità: minuti coperti, quindi valore di listino, quindi minor numero di appuntamenti. Esclude data, professionista o finestra incompatibili, pausa, sovrapposizioni del professionista e appuntamenti contemporanei dello stesso cliente. Non inferisce disponibilità dallo storico e non stima probabilità di risposta.

Gli inviti sono testi selezionabili; nessun invio reale. Solo le conferme selezionate vengono aggiunte all’agenda e rimosse dalla lista d’attesa. Al salvataggio si ripetono i controlli sull’intero piano, con rifiuto atomico in caso di conflitto. Annullamento e backup conservano lo stato locale. Nessun blocco condiviso del posto, garanzia contro concorrenza tra dispositivi, gestione delle postazioni o dei tempi di posa: richiedono un modello e un backend dedicati.

`node --test src/studio/model.test.mjs src/studio/recovery.test.mjs` include confronti tra combinazioni, disponibilità, sovrapposizioni cliente, conferme parziali, conflitti sopraggiunti e rifiuto dei replay.
