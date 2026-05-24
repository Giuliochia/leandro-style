import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useOperatori } from '../../hooks/useOperatori'
import { useAppuntamentiSettimana, useAppuntamento } from '../../hooks/useAppuntamenti'
import { databases } from '../../appwrite/client'
import { DB_ID, COLLECTIONS } from '../../appwrite/config'
import { Query } from 'appwrite'
import ModalAppuntamento from '../../components/admin/ModalAppuntamento'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Spinner from '../../components/shared/Spinner'
import InfoTooltip from '../../components/shared/InfoTooltip'
import { STATI_LABEL, STATI_CLASS, STATI_NEXT, formatOra, formatDataOra } from '../../utils/appuntamenti'
import { logError } from '../../lib/logger'
import { esportaCSV, esportaPDF, esportaExcel } from '../../utils/exportAgenda'
import { isFestivita, nomeFestivita } from '../../utils/festivita'
import {
  format, addDays, addWeeks, subWeeks,
  startOfWeek, isSameDay, isToday, parseISO, getDay, addMinutes, isBefore, isAfter
} from 'date-fns'
import { it } from 'date-fns/locale'

const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const ROW_H = 48   // px per slot 30 min
const ORA_W = 44   // px colonna ore

export default function Agenda() {
  const { operatori, loading: loadingOp } = useOperatori()
  const [dataCorrente, setDataCorrente] = useState(new Date())
  const [operatoreId, setOperatoreId] = useState(null)
  const [slotSelezionato, setSlotSelezionato] = useState(null)
  const [dettaglioId, setDettaglioId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showExport, setShowExport] = useState(false)
  const [exportData, setExportData] = useState(null)
  const [showExportRange, setShowExportRange] = useState(false)
  const doRefresh = () => setRefreshKey(k => k + 1)

  const lunediCorrente = useMemo(
    () => startOfWeek(dataCorrente, { weekStartsOn: 1 }),
    [dataCorrente]
  )

  const opAttivo = operatori.find(o => o.$id === operatoreId) || operatori[0]

  useEffect(() => {
    if (operatori.length > 0 && !operatoreId) setOperatoreId(operatori[0].$id)
  }, [operatori, operatoreId])

  if (loadingOp) return <div className="page-center"><Spinner /></div>
  if (operatori.length === 0) return (
    <div className="page">
      <h1 className="page__title">Agenda</h1>
      <div className="alert alert--warning">Nessun operatore. Aggiungine uno prima.</div>
    </div>
  )

  return (
    <div className="agenda-page">
      {/* Header */}
      <div className="agenda-header">
        <div className="agenda-header__nav">
          <button className="icon-btn" onClick={() => setDataCorrente(d => subWeeks(d, 1))}>‹</button>
          <button className="agenda-header__data" onClick={() => setDataCorrente(new Date())}>
            {`Sett. ${format(startOfWeek(dataCorrente, { weekStartsOn: 1 }), 'd MMM', { locale: it })}`}
          </button>
          <button className="icon-btn" onClick={() => setDataCorrente(d => addWeeks(d, 1))}>›</button>
          <input
            type="date"
            className="agenda-date-jump"
            title="Vai a una data"
            value={format(dataCorrente, 'yyyy-MM-dd')}
            onChange={e => { if (e.target.value) setDataCorrente(new Date(e.target.value + 'T12:00:00')) }}
          />
        </div>
        <div className="agenda-header__actions">
          <div className="export-menu-wrap">
            <button className="btn btn--ghost btn--sm" onClick={() => setShowExport(v => !v)}>
              ↓ Esporta
            </button>
            {showExport && exportData && (
              <div className="export-menu" onMouseLeave={() => setShowExport(false)}>
                <button className="export-menu__item" onClick={() => {
                  const nomiOp = Object.fromEntries(operatori.map(o => [o.$id, o.nome]))
                  esportaCSV(exportData.appuntamenti, exportData.nomiClienti, exportData.nomiServizi, lunediCorrente, nomiOp)
                  setShowExport(false)
                }}>CSV</button>
                <button className="export-menu__item" onClick={() => {
                  const nomiOp = Object.fromEntries(operatori.map(o => [o.$id, o.nome]))
                  esportaExcel(exportData.appuntamenti, exportData.nomiClienti, exportData.nomiServizi, lunediCorrente, nomiOp)
                  setShowExport(false)
                }}>Excel</button>
                <button className="export-menu__item" onClick={() => {
                  const nomiOp = Object.fromEntries(operatori.map(o => [o.$id, o.nome]))
                  esportaPDF(exportData.appuntamenti, exportData.nomiClienti, exportData.nomiServizi, lunediCorrente, nomiOp)
                  setShowExport(false)
                }}>PDF</button>
                <hr className="export-menu__divider" />
                <button className="export-menu__item" onClick={() => { setShowExport(false); setShowExportRange(true) }}>
                  📅 Periodo personalizzato…
                </button>
              </div>
            )}
          </div>
          <InfoTooltip testo={"Visualizza gli appuntamenti della settimana in una griglia oraria.\n\n• Frecce ‹ › per cambiare settimana, clicca la data per tornare a oggi.\n• Giorni rossi = chiusi (festività o chiusura ricorrente).\n• Clicca su uno slot vuoto per creare un appuntamento.\n• Clicca su un appuntamento per vederne i dettagli o cambiare stato.\n• Esporta scarica gli appuntamenti della settimana in CSV, Excel o PDF."} />
          <button className="btn btn--accent btn--sm" onClick={() => setSlotSelezionato(new Date())}>
            + Appuntamento
          </button>
        </div>
      </div>

      {operatori.length > 1 && (
        <div className="tab-bar" style={{ padding: '0 1rem', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          {operatori.map(o => (
            <button key={o.$id} className={`tab-bar__item ${(operatoreId || operatori[0].$id) === o.$id ? 'tab-bar__item--active' : ''}`} onClick={() => setOperatoreId(o.$id)}>{o.nome}</button>
          ))}
        </div>
      )}

      {opAttivo && (
        <GrigliaSettimana
          key={`sett-${refreshKey}`}
          operatoreId={opAttivo.$id}
          lunedi={lunediCorrente}
          onAppuntamentoClick={setDettaglioId}
          onSlotClick={(dataOra) => setSlotSelezionato(dataOra)}
          onDataReady={setExportData}
        />
      )}

      {slotSelezionato && opAttivo && (
        <ModalAppuntamento
          operatoreId={opAttivo.$id}
          dataIniziale={slotSelezionato}
          onClose={() => setSlotSelezionato(null)}
          onSaved={() => { setSlotSelezionato(null); doRefresh() }}
        />
      )}

      {showExportRange && (
        <ExportRangeModal
          operatori={operatori}
          onClose={() => setShowExportRange(false)}
        />
      )}

      {dettaglioId && (
        <DettaglioAppuntamento
          id={dettaglioId.includes('|') ? dettaglioId.split('|')[0] : dettaglioId}
          statoRapido={dettaglioId.includes('|') ? dettaglioId.split('|')[1] : null}
          onClose={() => setDettaglioId(null)}
          onUpdated={() => { setDettaglioId(null); doRefresh() }}
        />
      )}
    </div>
  )
}

// ── Griglia settimanale ───────────────────────────────────────────────────────

function GrigliaSettimana({ operatoreId, lunedi, onAppuntamentoClick, onSlotClick, onDataReady }) {
  const { appuntamenti, loading, error } = useAppuntamentiSettimana(operatoreId, lunedi)
  const [orariSettimana, setOrariSettimana] = useState([])
  const [blocchi, setBlocchi] = useState([])
  const [giorniChiusi, setGiorniChiusi] = useState(new Set())
  const [eccezioniApertura, setEccezioniApertura] = useState(new Set())
  const onDataReadyRef = useRef(onDataReady)
  useEffect(() => { onDataReadyRef.current = onDataReady })

  useEffect(() => {
    databases.listDocuments(DB_ID, COLLECTIONS.ORARI_LAVORO, [
      Query.equal('operatore_id', operatoreId),
      Query.equal('attivo', true),
      Query.limit(20),
    ]).then(res => setOrariSettimana(res.documents)).catch(e => logError('GrigliaSettimana/orari', e, { operatoreId }))
  }, [operatoreId])

  useEffect(() => {
    const domenica = addDays(lunedi, 6)
    domenica.setHours(23, 59, 59, 999)
    databases.listDocuments(DB_ID, COLLECTIONS.BLOCCHI, [
      Query.limit(200),
    ]).then(res => {
      const ricorrenti = res.documents.filter(b => b.ricorrente)
      setGiorniChiusi(new Set(ricorrenti.map(b => b.giorno_settimana)))
      const eccezioni = res.documents.filter(b => b.eccezione_apertura)
      setEccezioniApertura(new Set(eccezioni.map(b => {
        const d = new Date(b.data_ora_inizio)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      })))
      const normali = res.documents.filter(b => !b.ricorrente && !b.eccezione_apertura)
      setBlocchi(normali.filter(b => {
        const bI = new Date(b.data_ora_inizio)
        const bF = new Date(b.data_ora_fine)
        return bI <= domenica && bF >= lunedi
      }))
    }).catch(e => logError('GrigliaSettimana/blocchi', e, { operatoreId }))
  }, [operatoreId, lunedi])

  // Notifica il genitore con i dati per l'export ogni volta che gli appuntamenti cambiano.
  // I nomi sono già denormalizzati nei documenti (cliente_nome, servizi_nomi).
  useEffect(() => {
    if (!onDataReadyRef.current) return
    const nomiClienti = {}
    const nomiServizi = {}
    appuntamenti.forEach(a => {
      nomiClienti[a.cliente_id] = a.cliente_nome || ''
      nomiServizi[a.$id] = a.servizi_nomi ? a.servizi_nomi.split(', ') : []
    })
    onDataReadyRef.current({ appuntamenti, nomiClienti, nomiServizi })
  }, [appuntamenti])

  const giorni = Array.from({ length: 7 }, (_, i) => addDays(lunedi, i))

  if (loading) return <div className="agenda-body"><Spinner /></div>
  if (error) return <div className="agenda-body"><div className="alert alert--error">{error}</div></div>

  // Range ore
  let oraMin = 10, oraMax = 20
  if (orariSettimana.length) {
    const inizi = orariSettimana.map(o => parseInt(o.ora_inizio.split(':')[0]))
    const fini  = orariSettimana.map(o => {
      const [h, m] = o.ora_fine.split(':').map(Number)
      return m > 0 ? h + 1 : h
    })
    oraMin = Math.min(...inizi)
    oraMax = Math.max(...fini)
  }

  const righeOre = []
  for (let h = oraMin; h < oraMax; h++) {
    righeOre.push({ h, m: 0 })
    righeOre.push({ h, m: 30 })
  }
  const gridH = righeOre.length * ROW_H
  const now = new Date()

  return (
    <div className="agenda-cal">
      {/* Header giorni */}
      <div className="cal-header" style={{ paddingLeft: ORA_W }}>
        {giorni.map((giorno, idx) => {
          const appGiorno = appuntamenti.filter(a =>
            isSameDay(parseISO(a.data_ora_inizio), giorno) && a.stato !== 'annullato'
          )
          const haOrari = orariSettimana.some(o => o.giorno_settimana === getDay(giorno))
          const dKey = `${giorno.getFullYear()}-${String(giorno.getMonth()+1).padStart(2,'0')}-${String(giorno.getDate()).padStart(2,'0')}`
          const haEccezione = eccezioniApertura.has(dKey)
          const haBlocco = (!haEccezione && (isFestivita(giorno) || giorniChiusi.has(getDay(giorno)))) || blocchi.some(b => {
            const bI = new Date(b.data_ora_inizio)
            const bF = new Date(b.data_ora_fine)
            const gI = new Date(giorno); gI.setHours(0, 0, 0, 0)
            const gF = new Date(giorno); gF.setHours(23, 59, 59, 999)
            const overlap = isBefore(bI, gF) && isAfter(bF, gI)
            return overlap && (b.tutto_salone === true || !b.operatore_id || b.operatore_id === operatoreId)
          })
          return (
            <div key={idx} className={`cal-header__col ${isToday(giorno) ? 'cal-header__col--oggi' : ''} ${!haOrari ? 'cal-header__col--chiuso' : ''} ${haBlocco ? 'cal-header__col--blocco' : ''}`}>
              <span className="cal-header__gg">{GIORNI_BREVI[idx]}</span>
              <span className="cal-header__num">{format(giorno, 'd')}</span>
              {haBlocco
                ? <span className="cal-header__badge cal-header__badge--blocco">✕</span>
                : appGiorno.length > 0 && <span className="cal-header__badge">{appGiorno.length}</span>
              }
            </div>
          )
        })}
      </div>

      {/* Griglia scrollabile */}
      <div className="cal-scroll">
        <div className="cal-grid" style={{ height: gridH }}>
          {/* Colonna ore */}
          <div className="cal-ore" style={{ width: ORA_W }}>
            {righeOre.map((r, i) => (
              <div key={i} className="cal-ora-label" style={{ height: ROW_H, top: i * ROW_H }}>
                {r.m === 0 && <span>{String(r.h).padStart(2,'0')}:00</span>}
              </div>
            ))}
          </div>

          {/* Colonne giorni */}
          {giorni.map((giorno, gIdx) => {
            const giornoSett = getDay(giorno)
            const orariGiorno = orariSettimana.filter(o => o.giorno_settimana === giornoSett)
            const appGiorno = appuntamenti.filter(a =>
              isSameDay(parseISO(a.data_ora_inizio), giorno) && a.stato !== 'annullato'
            )
            // Blocchi attivi su questo giorno (per operatore specifico o tutto il salone)
            const festivita = nomeFestivita(giorno)
            const gKey = `${giorno.getFullYear()}-${String(giorno.getMonth()+1).padStart(2,'0')}-${String(giorno.getDate()).padStart(2,'0')}`
            const haEcc = eccezioniApertura.has(gKey)
            const isGiornoChiuso = !haEcc && (festivita || giorniChiusi.has(giornoSett))
            const _gI = new Date(giorno); _gI.setHours(0,0,0,0)
            const _gF = new Date(giorno); _gF.setHours(23,59,59,999)
            const blocchiGiorno = isGiornoChiuso
              ? [{ data_ora_inizio: _gI.toISOString(), data_ora_fine: _gF.toISOString(), motivo: festivita || 'Chiuso' }]
              : blocchi.filter(b => {
                  const bI = new Date(b.data_ora_inizio)
                  const bF = new Date(b.data_ora_fine)
                  const gI = new Date(giorno); gI.setHours(0, 0, 0, 0)
                  const gF = new Date(giorno); gF.setHours(23, 59, 59, 999)
                  const overlap = isBefore(bI, gF) && isAfter(bF, gI)
                  if (!overlap) return false
                  return b.tutto_salone === true || !b.operatore_id || b.operatore_id === operatoreId
                })

            return (
              <div key={gIdx} className={`cal-col ${isToday(giorno) ? 'cal-col--oggi' : ''}`} style={{ height: gridH }}>
                {/* Fasce lavorative */}
                {orariGiorno.map((o, oi) => {
                  const [hI, mI] = o.ora_inizio.split(':').map(Number)
                  const [hF, mF] = o.ora_fine.split(':').map(Number)
                  const topMin = (hI - oraMin) * 60 + mI
                  const durMin = (hF - hI) * 60 + (mF - mI)
                  return (
                    <div key={oi} className="cal-fascia" style={{ top: (topMin / 30) * ROW_H, height: (durMin / 30) * ROW_H }} />
                  )
                })}

                {/* Linee */}
                {righeOre.map((r, i) => (
                  <div key={i} className={`cal-riga ${r.m === 0 ? 'cal-riga--ora' : 'cal-riga--mezza'}`} style={{ top: i * ROW_H }} />
                ))}

                {/* Blocchi (ferie/chiusure) — overlay rosso */}
                {blocchiGiorno.map((b, bi) => {
                  const bI = new Date(b.data_ora_inizio)
                  const bF = new Date(b.data_ora_fine)
                  // Clamp al range orario visualizzato
                  const startH = Math.max(bI.getHours() + bI.getMinutes() / 60, oraMin)
                  const endH   = Math.min(bF.getHours() + bF.getMinutes() / 60, oraMax)
                  // Se il blocco copre tutto il giorno (ore 00:00-23:59) clamp all'intero range
                  const isFullDay = bI.getHours() === 0 && bI.getMinutes() === 0 && (bF.getHours() > 23 || (bF.getHours() === 23 && bF.getMinutes() >= 59))
                  const topMin  = isFullDay ? 0 : (startH - oraMin) * 60
                  const durMin  = isFullDay ? (oraMax - oraMin) * 60 : Math.max((endH - startH) * 60, 30)
                  return (
                    <div
                      key={bi}
                      className="cal-blocco"
                      style={{ top: (topMin / 30) * ROW_H, height: (durMin / 30) * ROW_H }}
                      title={b.motivo || 'Chiusura'}
                    >
                      <span className="cal-blocco__label">{b.motivo || 'Chiusura'}</span>
                    </div>
                  )
                })}

                {/* Slot cliccabili (solo fasce lavorative, non nel passato, non in blocco) */}
                {righeOre.map((r, i) => {
                  const slotDate = new Date(giorno)
                  slotDate.setHours(r.h, r.m, 0, 0)
                  const slotFine = addMinutes(slotDate, 30)
                  const inFascia = orariGiorno.some(orario => {
                    const [hI, mI] = orario.ora_inizio.split(':').map(Number)
                    const [hF, mF] = orario.ora_fine.split(':').map(Number)
                    const fI = new Date(giorno); fI.setHours(hI, mI, 0, 0)
                    const fF = new Date(giorno); fF.setHours(hF, mF, 0, 0)
                    return !isBefore(slotDate, fI) && !isAfter(slotFine, fF)
                  })
                  if (!inFascia || isBefore(slotDate, now)) return null
                  const occupato = appGiorno.some(a => {
                    const aI = new Date(a.data_ora_inizio)
                    const aF = addMinutes(aI, a.durata_minuti)
                    return isBefore(slotDate, aF) && isAfter(slotFine, aI)
                  })
                  if (occupato) return null
                  // Non mostrare slot cliccabili dove c'è un blocco
                  const inBlocco = blocchiGiorno.some(b =>
                    isBefore(slotDate, new Date(b.data_ora_fine)) && isAfter(slotFine, new Date(b.data_ora_inizio))
                  )
                  if (inBlocco) return null
                  return (
                    <div
                      key={i}
                      className="cal-slot-libero"
                      style={{ top: i * ROW_H, height: ROW_H }}
                      onClick={() => onSlotClick(slotDate)}
                      title={`${String(r.h).padStart(2,'0')}:${r.m === 0 ? '00' : '30'} — Libero`}
                    />
                  )
                })}

                {/* Appuntamenti */}
                {appGiorno.map(a => {
                  const dataOra = new Date(a.data_ora_inizio)
                  const minDaInizio = (dataOra.getHours() - oraMin) * 60 + dataOra.getMinutes()
                  const topPx = (minDaInizio / 30) * ROW_H
                  const hPx = Math.max((a.durata_minuti / 30) * ROW_H, ROW_H)
                  const isPassato = a.stato === 'prenotato' && isBefore(addMinutes(dataOra, a.durata_minuti), now)
                  return (
                    <div
                      key={a.$id}
                      className={`cal-app cal-app--${a.stato} ${isPassato ? 'cal-app--passato' : ''}`}
                      style={{ top: topPx, height: hPx }}
                    >
                      <button className="cal-app__main" onClick={e => { e.stopPropagation(); onAppuntamentoClick(a.$id) }}>
                        <span className="cal-app__ora">{formatOra(a.data_ora_inizio)}</span>
                        <span className="cal-app__nome">{a.cliente_nome || '…'}</span>
                      </button>
                      {isPassato && (
                        <div className="cal-app__quick" onClick={e => e.stopPropagation()}>
                          <button className="cal-app__quick-btn cal-app__quick-btn--ok" title="Completato" onClick={() => onAppuntamentoClick(a.$id + '|completato')}>✓</button>
                          <button className="cal-app__quick-btn cal-app__quick-btn--no" title="No show" onClick={() => onAppuntamentoClick(a.$id + '|no_show')}>✗</button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Overlay chiuso */}
                {orariGiorno.length === 0 && (
                  <div className="cal-col__chiuso">Chiuso</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Export range ─────────────────────────────────────────────────────────────

function ExportRangeModal({ operatori, onClose }) {
  const oggi = format(new Date(), 'yyyy-MM-dd')
  const [da, setDa] = useState(oggi)
  const [a, setA] = useState(oggi)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  const esporta = async (tipo) => {
    if (!da || !a || da > a) { setErrore('Intervallo date non valido.'); return }
    setLoading(true)
    setErrore('')
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.APPUNTAMENTI, [
        Query.greaterThanEqual('data_ora_inizio', da + 'T00:00:00.000+00:00'),
        Query.lessThanEqual('data_ora_inizio', a + 'T23:59:59.999+00:00'),
        Query.orderAsc('data_ora_inizio'),
        Query.limit(500),
      ])
      const apps = res.documents
      const nomiClienti = Object.fromEntries(apps.map(ap => [ap.cliente_id, ap.cliente_nome || '']))
      const nomiServizi = Object.fromEntries(apps.map(ap => [ap.$id, ap.servizi_nomi ? ap.servizi_nomi.split(', ') : []]))
      const nomiOp = Object.fromEntries(operatori.map(o => [o.$id, o.nome]))
      const dataInizio = new Date(da + 'T12:00:00')
      if (tipo === 'csv') esportaCSV(apps, nomiClienti, nomiServizi, dataInizio, nomiOp)
      if (tipo === 'excel') esportaExcel(apps, nomiClienti, nomiServizi, dataInizio, nomiOp)
      if (tipo === 'pdf') esportaPDF(apps, nomiClienti, nomiServizi, dataInizio, nomiOp)
      onClose()
    } catch (e) {
      setErrore('Errore durante il recupero dei dati.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Esporta periodo" onClose={onClose}>
      <div className="form-stack">
        {errore && <div className="alert alert--error">{errore}</div>}
        <div className="row-actions">
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-group__label">Dal</label>
            <input type="date" className="input-group__field" value={da} onChange={e => setDa(e.target.value)} />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-group__label">Al</label>
            <input type="date" className="input-group__field" value={a} onChange={e => setA(e.target.value)} />
          </div>
        </div>
        <div className="row-actions mt-2">
          <Button variant="outline" onClick={() => esporta('csv')} loading={loading}>CSV</Button>
          <Button variant="outline" onClick={() => esporta('excel')} loading={loading}>Excel</Button>
          <Button variant="accent" onClick={() => esporta('pdf')} loading={loading}>PDF</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Dettaglio appuntamento ────────────────────────────────────────────────────

function DettaglioAppuntamento({ id, statoRapido, onClose, onUpdated }) {
  const { appuntamento, servizi, loading, error, aggiornaStato } = useAppuntamento(id)
  const [modalModifica, setModalModifica] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmStato, setConfirmStato] = useState(statoRapido || null)
  const [motivoAnnullo, setMotivoAnnullo] = useState('')

  const nomeCliente = appuntamento?.cliente_nome || '…'
  const nomiServizi = appuntamento?.servizi_nomi ? appuntamento.servizi_nomi.split(', ') : []

  const handleStato = async (stato) => {
    setSaving(true)
    try {
      if (stato === 'annullato' && motivoAnnullo.trim()) {
        await aggiornaStato(stato)
        await databases.updateDocument(DB_ID, COLLECTIONS.APPUNTAMENTI, id, {
          note: motivoAnnullo.trim().slice(0, 500),
        })
      } else {
        await aggiornaStato(stato)
      }
      setConfirmStato(null)
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal title="Appuntamento" onClose={onClose}>
        {loading && <div className="page-center"><Spinner /></div>}
        {error && <div className="alert alert--error">{error}</div>}
        {appuntamento && (
          <div className="form-stack">
            <div className="detail-row">
              <span className="detail-row__label">Cliente</span>
              <span className="detail-row__value">{nomeCliente || '…'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Data e ora</span>
              <span className="detail-row__value">{formatDataOra(appuntamento.data_ora_inizio)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Durata</span>
              <span className="detail-row__value">{appuntamento.durata_minuti} min</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Servizi</span>
              <span className="detail-row__value">{nomiServizi.join(', ') || '—'}</span>
            </div>
            {appuntamento.note && (
              <div className="detail-row">
                <span className="detail-row__label">Note</span>
                <span className="detail-row__value">{appuntamento.note}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-row__label">Stato</span>
              <span className={`badge ${STATI_CLASS[appuntamento.stato]}`}>{STATI_LABEL[appuntamento.stato]}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Creato da</span>
              <span className="detail-row__value">{appuntamento.created_by === 'admin' ? 'Admin' : 'Cliente'}</span>
            </div>

            {STATI_NEXT[appuntamento.stato].length > 0 && (
              <div className="detail-section">
                <span className="detail-section__title">Cambia stato</span>
                <div className="row-actions mt-2">
                  {STATI_NEXT[appuntamento.stato].map(s => (
                    <Button
                      key={s}
                      variant={s === 'annullato' ? 'danger' : s === 'completato' ? 'accent' : 'outline'}
                      onClick={() => setConfirmStato(s)}
                      disabled={saving}
                    >
                      {STATI_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {appuntamento.stato === 'prenotato' && (
              <Button variant="outline" fullWidth onClick={() => setModalModifica(true)}>
                ✏️ Modifica appuntamento
              </Button>
            )}
          </div>
        )}
      </Modal>

      {confirmStato && (
        <Modal
          title={`Conferma: ${STATI_LABEL[confirmStato]}`}
          onClose={() => setConfirmStato(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmStato(null)}>Annulla</Button>
              <Button variant={confirmStato === 'annullato' ? 'danger' : 'accent'} onClick={() => handleStato(confirmStato)} loading={saving}>
                Conferma
              </Button>
            </>
          }
        >
          <p>Vuoi segnare questo appuntamento come <strong>{STATI_LABEL[confirmStato]}</strong>?</p>
          {confirmStato === 'annullato' && (
            <textarea
              className="input-group__field mt-3"
              rows={3}
              placeholder="Motivo annullamento (opzionale)…"
              value={motivoAnnullo}
              onChange={e => setMotivoAnnullo(e.target.value)}
            />
          )}
        </Modal>
      )}

      {modalModifica && appuntamento && (
        <ModalAppuntamento
          appuntamento={appuntamento}
          serviziAppuntamento={servizi}
          operatoreId={appuntamento.operatore_id}
          onClose={() => setModalModifica(false)}
          onSaved={() => { setModalModifica(false); onUpdated() }}
        />
      )}
    </>
  )
}
