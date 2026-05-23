import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Previene formula injection in CSV/Excel (=, +, -, @ come primo carattere)
function sanitizzaCella(val) {
  if (typeof val !== 'string') return val
  return /^[=+\-@]/.test(val) ? `'${val}` : val
}

// nomiOperatori: { [operatoreId]: string } — opzionale, se presente aggiunge colonna Barbiere
function righeExport(appuntamenti, nomiClienti, nomiServizi, nomiOperatori = null) {
  const multiOp = nomiOperatori && Object.keys(nomiOperatori).length > 1
  return [...appuntamenti]
    .filter(a => a.stato !== 'annullato')
    .sort((a, b) => new Date(a.data_ora_inizio) - new Date(b.data_ora_inizio))
    .map(a => ({
      data: format(new Date(a.data_ora_inizio), 'EEE dd/MM', { locale: it }),
      ora: format(new Date(a.data_ora_inizio), 'HH:mm'),
      cliente: sanitizzaCella(nomiClienti[a.cliente_id] || a.cliente_nome || '—'),
      servizi: sanitizzaCella((nomiServizi[a.$id] || []).join(', ') || a.servizi_nomi || '—'),
      durata: `${a.durata_minuti} min`,
      barbiere: multiOp ? sanitizzaCella(nomiOperatori[a.operatore_id] || '—') : null,
      stato: a.stato,
    }))
}

function nomeFile(prefisso, settimana) {
  return `${prefisso}-${format(settimana, 'yyyy-MM-dd')}`
}

export function esportaCSV(appuntamenti, nomiClienti, nomiServizi, settimana, nomiOperatori = null) {
  const righe = righeExport(appuntamenti, nomiClienti, nomiServizi, nomiOperatori)
  const hasBarbiere = righe[0]?.barbiere !== null
  const header = ['Data', 'Ora', 'Cliente', 'Servizi', 'Durata', ...(hasBarbiere ? ['Barbiere'] : []), 'Stato']
  const csv = [
    header.join(';'),
    ...righe.map(r => [r.data, r.ora, r.cliente, r.servizi, r.durata, ...(hasBarbiere ? [r.barbiere] : []), r.stato].join(';')),
  ].join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeFile('agenda', settimana)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function esportaExcel(appuntamenti, nomiClienti, nomiServizi, settimana, nomiOperatori = null) {
  const righe = righeExport(appuntamenti, nomiClienti, nomiServizi, nomiOperatori)
  const hasBarbiere = righe[0]?.barbiere !== null

  const ws = XLSX.utils.json_to_sheet(
    righe.map(r => ({
      Data: r.data,
      Ora: r.ora,
      Cliente: r.cliente,
      Servizi: r.servizi,
      Durata: r.durata,
      ...(hasBarbiere ? { Barbiere: r.barbiere } : {}),
      Stato: r.stato,
    }))
  )

  ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 25 }, { wch: 35 }, { wch: 10 }, ...(hasBarbiere ? [{ wch: 18 }] : []), { wch: 12 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Agenda')
  XLSX.writeFile(wb, `${nomeFile('agenda', settimana)}.xlsx`)
}

export function esportaPDF(appuntamenti, nomiClienti, nomiServizi, settimana, nomiOperatori = null) {
  const righe = righeExport(appuntamenti, nomiClienti, nomiServizi, nomiOperatori)
  const hasBarbiere = righe[0]?.barbiere !== null
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const titolo = `Agenda settimana del ${format(settimana, 'd MMMM yyyy', { locale: it })}`
  doc.setFontSize(14)
  doc.setTextColor(40)
  doc.text("Leandro's Style", 14, 14)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(titolo, 14, 21)

  const head = [['Data', 'Ora', 'Cliente', 'Servizi', 'Durata', ...(hasBarbiere ? ['Barbiere'] : []), 'Stato']]
  const body = righe.map(r => [r.data, r.ora, r.cliente, r.servizi, r.durata, ...(hasBarbiere ? [r.barbiere] : []), r.stato])

  autoTable(doc, {
    startY: 27,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [80, 120, 85], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 15 },
      2: { cellWidth: 38 },
      3: { cellWidth: hasBarbiere ? 65 : 80 },
      4: { cellWidth: 18 },
      ...(hasBarbiere ? { 5: { cellWidth: 22 }, 6: { cellWidth: 20 } } : { 5: { cellWidth: 22 } }),
    },
  })

  doc.save(`${nomeFile('agenda', settimana)}.pdf`)
}
