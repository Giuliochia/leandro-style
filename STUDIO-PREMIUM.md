# Leandro Style / Studio

Questa proposta usa il gestionale esistente come base. Non promette ricavi: il pilota misura se il prodotto elimina lavoro e viene usato davvero.

## Cosa provare

`VITE_STUDIO_DEMO_ONLY=true npm run dev` apre una demo isolata; `/demo` la apre anche nella build normale. I dati di esempio sono locali al browser. Non sono account, prezzi o appuntamenti del salone reale. La demo non invia notifiche né messaggi e non incassa pagamenti.

Agenda giornaliera per professionista, apertura del dettaglio, modifica/creazione/cancellazione/completamento, controllo delle sovrapposizioni e della pausa. Prenotazione cliente con disponibilità calcolata dallo stesso controllo. Schede clienti con note e storico, listino modificabile, calendario ICS, backup JSON validato. Modificare la durata di un servizio viene rifiutato se genera conflitti sugli appuntamenti esistenti.

L'agenda dimostrativa usa 09–13 e 14–19, tre professionisti e listino illustrativo. Valore in agenda significa somma dei prezzi dei servizi, non fatturato o incasso. Occupazione è durata prenotata su 27 ore aggregate. Il gestionale Appwrite conserva la propria configurazione e le sue regole di disponibilità.

Il layout amministratore reale riceve navigazione laterale su desktop, navigazione compatta su mobile, accesso al Team e una dashboard più sobria. La dashboard può caricarsi anche senza operatori e presenta errore/retry. Non è stata verificata con credenziali Appwrite di produzione.

## Direzione visiva

Verde carbone, carta chiara, accento rame e tre colori discreti per il team. Titoli editoriali, interfaccia operativa compatta. Agenda come elemento dominante; nessuna metrica fittizia di crescita. Motion: ingresso delle viste, pannello laterale, transizioni degli appuntamenti, barre animate e composizione cinetica nella prenotazione. Tutte rispettano `prefers-reduced-motion`; dialog native per focus ed Escape.

## Come proporlo a Leandro

Vendere tempo restituito al salone e un'esperienza di prenotazione coerente con il suo marchio. Fare una dimostrazione di sette minuti: registrare un cliente, provare un orario occupato, prenotare dal percorso cliente e trovare l'appuntamento in agenda. Usare servizi e orari reali soltanto dopo raccolta con il titolare.

**Apertura del colloquio:** «Ho preparato un'esperienza su misura per Leandro Style. Vorrei mostrarti come gestire una prenotazione senza interrompere il lavoro e avere subito preferenze e storico del cliente. In sette minuti la proviamo con una giornata di esempio.»

**Pilota di 30 giorni:** un salone, un referente, configurazione servizi/team, formazione breve e assistenza. Prima annotare per una settimana minuti spesi sulle prenotazioni, appuntamenti mancati e numero di richieste. Confrontare gli stessi indicatori durante il pilota e raccogliere feedback settimanale. Obiettivo di validazione: utilizzo dell'agenda da parte dello staff e almeno cinque prenotazioni completate dai clienti senza assistenza; nessuna promessa di incremento del fatturato.

**Prezzo da testare, non validato dal mercato:** 290 € per configurazione/pilota e 59 €/mese per assistenza e utilizzo dopo il collaudo. Infrastruttura, messaggi a consumo, personalizzazioni e IVA ove dovuta vanno definiti separatamente. Non vendere ancora come SaaS multisalone: isolamento dati, billing, onboarding e supporto devono essere costruiti e verificati prima.

Dopo il pilota raccogliere una testimonianza autorizzata con un risultato misurato. Mostrare il caso studio a cinque saloni della stessa fascia, tramite presentazioni personali e una demo con il loro brand. Non spedire campagne automatiche prima di avere un'offerta validata. I contenuti social devono mostrare una vera sequenza di prenotazione o di lavoro, non immagini generiche e frasi promozionali.

## Prima di un avvio reale

Verificare autenticazione e permessi Appwrite con account admin/cliente, controlli server contro prenotazioni concorrenti, gestione degli orari reali, backup e ripristino, notifiche e deduplicazione dei promemoria. Pagamenti, acconti, lista d'attesa e riattivazione clienti sono sviluppi successivi: non presenti nella demo e non inclusi come funzioni pronte nell'offerta.

## Verifica

`node --test src/studio/model.test.mjs` controlla conflitti, adiacenza, pausa, chiusura, cancellazione, disponibilità, backup e ICS. `VITE_STUDIO_DEMO_ONLY=true npm run build` crea l'anteprima senza service worker. `npm run build` conserva la PWA del gestionale. La demo è un percorso di frontend locale, non una prova end-to-end del backend.
