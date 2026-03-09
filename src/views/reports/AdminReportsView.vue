<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { reportService } from '@/services/reports/report.service'
import type { FirstReportResponse } from '@/types/reports/one_nine/FirstReportResponse'
import type { SecondReportResponse } from '@/types/reports/two_eight/SecondReportResponse'
import type { FifthReportResponse } from '@/types/reports/five/FifthReportResponse'
import type { SixthReportResponse } from '@/types/reports/six/SixthReportResponse'
import type { SeventhReportResponse } from '@/types/reports/seven/SeventhReportResponse'

type DocWT = jsPDF & { lastAutoTable: { finalY: number } }

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = reactive({ show: false, message: '', color: 'success' as string, icon: '' })
const notifyMap = {
    success: { color: 'success', icon: 'mdi-check-circle-outline' },
    error: { color: 'error', icon: 'mdi-alert-circle-outline' },
} as const
function notify(message: string, type: keyof typeof notifyMap = 'success') {
    Object.assign(snackbar, { show: true, message, ...notifyMap[type] })
}
function errorMsg(e: unknown): string {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
    return 'Ocurrió un error inesperado'
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type TabKey = 'financial' | 'ads' | 'advertisers' | 'topSubs' | 'topComments'
const tab = ref<TabKey>('financial')
const TABS: { key: TabKey; label: string; icon: string; requireDates: boolean }[] = [
    { key: 'financial', label: 'Ganancias', icon: 'mdi-chart-bar', requireDates: false },
    { key: 'ads', label: 'Anuncios', icon: 'mdi-bullhorn-outline', requireDates: false },
    { key: 'advertisers', label: 'Por Anunciante', icon: 'mdi-account-tie-outline', requireDates: false },
    { key: 'topSubs', label: 'Top 5 Suscripciones', icon: 'mdi-podium-gold', requireDates: false },
    { key: 'topComments', label: 'Top 5 Comentarios', icon: 'mdi-comment-star-outline', requireDates: false },
]

// ── Filtros ───────────────────────────────────────────────────────────────────
const startDate = ref<string>('')
const endDate = ref<string>('')
const adTypeFilter = ref<string>('')
const advertiserFilter = ref<string>('')
const dateError = ref<string>('')

watch(tab, () => { adTypeFilter.value = ''; advertiserFilter.value = ''; dateError.value = '' })

function validateDates(): boolean {
    dateError.value = ''
    if (startDate.value && endDate.value && startDate.value > endDate.value) {
        dateError.value = 'La fecha de inicio debe ser anterior a la de fin'
        return false
    }
    return true
}

// ── Datos crudos ──────────────────────────────────────────────────────────────
const financialData = ref<FifthReportResponse | null>(null)
const adsRaw = ref<SixthReportResponse[]>([])
const advertisersRaw = ref<SeventhReportResponse[]>([])
const topSubsRaw = ref<SecondReportResponse[]>([])
const topCommentsRaw = ref<FirstReportResponse[]>([])
const loading = ref(false)
const hasData = reactive<Record<TabKey, boolean>>({
    financial: false, ads: false, advertisers: false, topSubs: false, topComments: false,
})

// ── Opciones de filtro ────────────────────────────────────────────────────────
const adTypeOptions = computed(() => [...new Set(adsRaw.value.map(a => a.nameTypeAd))])
const advertiserOptions = computed(() => [...new Set(advertisersRaw.value.map(a => a.advertiserName))])

// ── Datos filtrados ───────────────────────────────────────────────────────────
const adsFiltered = computed(() =>
    adTypeFilter.value ? adsRaw.value.filter(a => a.nameTypeAd === adTypeFilter.value) : adsRaw.value
)
const advertisersFiltered = computed(() =>
    advertiserFilter.value
        ? advertisersRaw.value.filter(a => a.advertiserName === advertiserFilter.value)
        : advertisersRaw.value
)
const topSubsSorted = computed(() =>
    [...topSubsRaw.value].sort((a, b) => b.subscriptions.length - a.subscriptions.length).slice(0, 5)
)
const topCommentsSorted = computed(() =>
    [...topCommentsRaw.value].sort((a, b) => b.comments.length - a.comments.length).slice(0, 5)
)

// ── Totales financieros ───────────────────────────────────────────────────────
// magazineCost es costo operativo → se RESTA de los ingresos para obtener la ganancia neta
const financialTotals = computed(() => {
    if (!financialData.value) return { magazineCost: 0, adIncome: 0, blockIncome: 0, total: 0 }
    const magazineCost = financialData.value.magazines.reduce((s, m) =>
        s + m.payments.reduce((ss, p) => ss + p.payment, 0), 0)
    const adIncome = financialData.value.ads.reduce((s, a) => s + a.cost, 0)
    const blockIncome = financialData.value.adBlocks.reduce((s, b) => s + b.payment, 0)
    return { magazineCost, adIncome, blockIncome, total: adIncome + blockIncome - magazineCost }
})

// ── Carga ─────────────────────────────────────────────────────────────────────
async function loadReport() {
    if (!validateDates()) return
    loading.value = true
    adTypeFilter.value = ''
    advertiserFilter.value = ''
    const sd = startDate.value || null
    const ed = endDate.value || null
    try {
        switch (tab.value) {
            case 'financial':
                financialData.value = await reportService.getFinancialSummaryReport(sd, ed)
                hasData.financial = true
                break
            case 'ads':
                adsRaw.value = await reportService.getAdvertisementsReport(sd, ed)
                hasData.ads = true
                break
            case 'advertisers':
                advertisersRaw.value = await reportService.getAdvertisersReport(sd, ed)
                hasData.advertisers = true
                break
            case 'topSubs':
                topSubsRaw.value = await reportService.getSubscriptionsAdminReport(sd, ed)
                hasData.topSubs = true
                break
            case 'topComments':
                topCommentsRaw.value = await reportService.getCommentsAdminReport(sd, ed)
                hasData.topComments = true
                break
        }
        notify('Reporte generado')
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

// ── Formato ───────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
}
const periodLabel = computed(() => {
    if (!startDate.value && !endDate.value) return 'Todo el tiempo'
    if (startDate.value && endDate.value) return `${startDate.value} → ${endDate.value}`
    return startDate.value ? `Desde ${startDate.value}` : `Hasta ${endDate.value}`
})

// ── PDF ───────────────────────────────────────────────────────────────────────
function newDoc(landscape = false): DocWT {
    return new jsPDF({ orientation: landscape ? 'landscape' : 'portrait' }) as DocWT
}
function pdfHeader(doc: jsPDF, title: string) {
    doc.setFontSize(16); doc.setTextColor(40)
    doc.text(title, 14, 18)
    doc.setFontSize(10); doc.setTextColor(120)
    doc.text(`Período: ${periodLabel.value}`, 14, 25)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-GT')}`, 14, 30)
}

function downloadPdf() {
    if (!hasData[tab.value]) { notify('Primero genera el reporte', 'error'); return }
    switch (tab.value) {
        case 'financial': pdfFinancial(); break
        case 'ads': pdfAds(); break
        case 'advertisers': pdfAdvertisers(); break
        case 'topSubs': pdfTopSubs(); break
        case 'topComments': pdfTopComments(); break
    }
}

function pdfFinancial() {
    const doc = newDoc(true)
    pdfHeader(doc, 'Reporte de Ganancias (Admin)')
    let y = 38

    // Tabla resumen — magazineCost se muestra como egreso (negativo)
    autoTable(doc, {
        startY: y,
        head: [['Concepto', 'Monto (Q)']],
        body: [
            ['Ingresos por anuncios', `Q${financialTotals.value.adIncome}`],
            ['Ingresos por bloqueos', `Q${financialTotals.value.blockIncome}`],
            ['Costo Revistas (egreso)', `-Q${financialTotals.value.magazineCost}`],
            ['GANANCIA NETA', `Q${financialTotals.value.total}`],
        ],
        headStyles: { fillColor: [45, 30, 14] }, styles: { fontSize: 10 }, margin: { left: 14 },
    })
    y = (doc as DocWT).lastAutoTable.finalY + 10

    // Detalle por revista
    for (const mag of financialData.value!.magazines) {
        const magTotal = mag.payments.reduce((s, p) => s + p.payment, 0)
        if (y > 168) { doc.addPage(); y = 20 }
        doc.setFontSize(10); doc.setTextColor(40)
        doc.text(`${mag.nameMagazine}  (costo: Q${magTotal})`, 14, y); y += 4
        autoTable(doc, {
            startY: y, head: [['Pago (Q)', 'Fecha']],
            body: mag.payments.map(p => [`Q${p.payment}`, fmtDate(p.paymentDate)]),
            styles: { fontSize: 8 }, headStyles: { fillColor: [45, 30, 14] }, margin: { left: 18 },
        })
        y = (doc as DocWT).lastAutoTable.finalY + 6
    }
    doc.save(`ganancias_${Date.now()}.pdf`)
}

function pdfAds() {
    const doc = newDoc(true)
    pdfHeader(doc, 'Reporte de Anuncios (Admin)')
    if (adTypeFilter.value) {
        doc.setFontSize(10); doc.setTextColor(120)
        doc.text(`Tipo: ${adTypeFilter.value}`, 14, 35)
    }
    autoTable(doc, {
        startY: adTypeFilter.value ? 40 : 36,
        head: [['ID', 'Tipo', 'Costo (Q)', 'Fecha', 'Links']],
        body: adsFiltered.value.map(a => [
            a.idAd, a.nameTypeAd, `Q${a.cost}`, fmtDate(a.dateAd), a.links.length
        ]),
        headStyles: { fillColor: [45, 30, 14] }, styles: { fontSize: 9 }, margin: { left: 14 },
    })
    doc.save(`anuncios_${Date.now()}.pdf`)
}

function pdfAdvertisers() {
    const doc = newDoc(true)
    pdfHeader(doc, 'Reporte por Anunciante')
    if (advertiserFilter.value) {
        doc.setFontSize(10); doc.setTextColor(120)
        doc.text(`Anunciante: ${advertiserFilter.value}`, 14, 35)
    }
    let y = advertiserFilter.value ? 40 : 36
    for (const adv of advertisersFiltered.value) {
        const total = adv.advertisements.reduce((s, a) => s + a.totalCost, 0)
        if (y > 168) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setTextColor(40)
        doc.text(`${adv.advertiserName}  —  Total: Q${total}`, 14, y); y += 5
        autoTable(doc, {
            startY: y,
            head: [['ID', 'Tipo', 'Costo Total (Q)', 'Fecha']],
            body: adv.advertisements.map(a => [a.id, a.adTypeName, `Q${a.totalCost}`, fmtDate(a.creationDate)]),
            styles: { fontSize: 8 }, headStyles: { fillColor: [45, 30, 14] }, margin: { left: 18 },
        })
        y = (doc as DocWT).lastAutoTable.finalY + 8
    }
    doc.save(`anunciantes_${Date.now()}.pdf`)
}

function pdfTopSubs() {
    const doc = newDoc()
    pdfHeader(doc, 'Top 5 Revistas por Suscripciones (Admin)')
    let y = 36
    topSubsSorted.value.forEach((mag, i) => {
        if (y > 258) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setTextColor(40)
        doc.text(`#${i + 1}  ${mag.nameMagazine}  (${mag.subscriptions.length} suscripciones)`, 14, y); y += 5
        autoTable(doc, {
            startY: y, head: [['Suscriptor', 'Fecha']],
            body: mag.subscriptions.map(s => [s.name, fmtDate(s.subscriptionDate)]),
            styles: { fontSize: 8 }, headStyles: { fillColor: [45, 30, 14] }, margin: { left: 18 },
        })
        y = (doc as DocWT).lastAutoTable.finalY + 8
    })
    doc.save(`top5-suscripciones_${Date.now()}.pdf`)
}

function pdfTopComments() {
    const doc = newDoc()
    pdfHeader(doc, 'Top 5 Revistas por Comentarios (Admin)')
    let y = 36
    topCommentsSorted.value.forEach((mag, i) => {
        if (y > 258) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setTextColor(40)
        doc.text(`#${i + 1}  ${mag.nameMagazine}  (${mag.comments.length} comentarios)`, 14, y); y += 5
        // Incluye columna "Comentario" (campo comment de CommentReport)
        autoTable(doc, {
            startY: y, head: [['Usuario', 'Comentario', 'Fecha']],
            body: mag.comments.map(c => [c.name, c.comment, fmtDate(c.commentDate)]),
            styles: { fontSize: 8 }, headStyles: { fillColor: [45, 30, 14] }, margin: { left: 18 },
            columnStyles: { 1: { cellWidth: 100 } },
        })
        y = (doc as DocWT).lastAutoTable.finalY + 8
    })
    doc.save(`top5-comentarios_${Date.now()}.pdf`)
}
</script>

<template>
    <v-app style="background:#1a1008;">

        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
            <v-icon :icon="snackbar.icon" class="mr-2" />{{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <v-container class="py-6" style="background:#1a1008; min-height:100vh;">

            <!-- ── Encabezado ── -->
            <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-3">
                <div>
                    <p class="text-h5 font-weight-bold mb-1" style="color:#f5f0e8;">
                        <v-icon icon="mdi-shield-crown-outline" color="#e8c97a" class="mr-2" />
                        Reportes del Administrador
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">
                        Métricas globales de la plataforma
                    </p>
                </div>
            </div>

            <!-- ── Panel de filtros ── -->
            <v-card rounded="xl" elevation="0" class="filter-card mb-5 pa-5">
                <p class="text-body-2 font-weight-bold mb-1" style="color:#e8c97a;">
                    <v-icon icon="mdi-filter-outline" size="16" class="mr-1" />
                    Filtros de fecha
                </p>
                <p class="text-caption mb-4" style="color:#c8b8a2;">
                    <v-icon icon="mdi-information-outline" size="13" class="mr-1" />
                    Las fechas son opcionales en todos los reportes. Si no se seleccionan, se incluyen todos los
                    registros.
                </p>
                <v-row dense align="center">
                    <v-col cols="12" sm="4">
                        <v-text-field v-model="startDate" label="Fecha de inicio" type="date" variant="outlined"
                            density="compact" class="report-input" clearable />
                    </v-col>
                    <v-col cols="12" sm="4">
                        <v-text-field v-model="endDate" label="Fecha de fin" type="date" variant="outlined"
                            density="compact" class="report-input" clearable />
                    </v-col>
                    <v-col cols="12" sm="4" class="d-flex gap-2">
                        <v-btn variant="flat" rounded="lg" :loading="loading" prepend-icon="mdi-magnify"
                            class="btn-primary flex-grow-1" @click="loadReport">
                            Generar
                        </v-btn>
                        <v-btn variant="outlined" rounded="lg" prepend-icon="mdi-file-pdf-box" :disabled="!hasData[tab]"
                            style="border-color:#e8c97a !important; color:#e8c97a !important;" @click="downloadPdf">
                            PDF
                        </v-btn>
                    </v-col>
                </v-row>
                <p v-if="dateError" class="text-caption mt-2" style="color:#b5451b;">
                    <v-icon icon="mdi-alert-circle-outline" size="13" class="mr-1" />{{ dateError }}
                </p>
            </v-card>

            <!-- ── Chip de período ── -->
            <div v-if="hasData[tab]" class="d-flex align-center gap-2 mb-4 flex-wrap">
                <v-chip size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                    <v-icon icon="mdi-calendar-range" size="13" class="mr-1" />{{ periodLabel }}
                </v-chip>
                <v-chip v-if="adTypeFilter" size="small" variant="flat" closable
                    style="background:#3d2f20; color:#c8b8a2;" @click:close="adTypeFilter = ''">
                    <v-icon icon="mdi-bullhorn-outline" size="13" class="mr-1" />{{ adTypeFilter }}
                </v-chip>
                <v-chip v-if="advertiserFilter" size="small" variant="flat" closable
                    style="background:#3d2f20; color:#c8b8a2;" @click:close="advertiserFilter = ''">
                    <v-icon icon="mdi-account-tie-outline" size="13" class="mr-1" />{{ advertiserFilter }}
                </v-chip>
            </div>

            <!-- ── Tabs ── -->
            <v-tabs v-model="tab" color="#e8c97a" class="mb-5 tabs-bar" show-arrows>
                <v-tab v-for="t in TABS" :key="t.key" :value="t.key" :prepend-icon="t.icon">
                    {{ t.label }}
                    <v-icon v-if="hasData[t.key]" icon="mdi-check-circle" size="13" color="#4caf50" class="ml-1" />
                </v-tab>
            </v-tabs>

            <!-- ── Loading ── -->
            <div v-if="loading" class="text-center py-12">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
                <p class="text-body-2 mt-4" style="color:#c8b8a2;">Cargando reporte...</p>
            </div>

            <v-window v-else v-model="tab">

                <!-- ════ GANANCIAS ════ -->
                <v-window-item value="financial">
                    <div v-if="!hasData.financial" class="empty-state">
                        <v-icon icon="mdi-chart-areaspline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">Presiona <strong>Generar</strong> para cargar el reporte</p>
                    </div>
                    <template v-else-if="financialData">
                        <!-- Totales -->
                        <v-row class="mb-6">
                            <v-col cols="12" sm="6" md="3">
                                <!-- Costo Revistas → egreso, se muestra en rojo/neutro -->
                                <v-card rounded="xl" elevation="0" class="summary-card pa-4 text-center">
                                    <v-icon icon="mdi-newspaper-variant-outline" color="#b5451b" size="28"
                                        class="mb-1" />
                                    <p class="text-caption" style="color:#c8b8a2;">Costo Revistas</p>
                                    <p class="text-h6 font-weight-bold" style="color:#b5451b;">
                                        -Q{{ financialTotals.magazineCost }}
                                    </p>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <v-card rounded="xl" elevation="0" class="summary-card pa-4 text-center">
                                    <v-icon icon="mdi-bullhorn-outline" color="#e8c97a" size="28" class="mb-1" />
                                    <p class="text-caption" style="color:#c8b8a2;">Anuncios</p>
                                    <p class="text-h6 font-weight-bold" style="color:#e8c97a;">
                                        Q{{ financialTotals.adIncome }}
                                    </p>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <v-card rounded="xl" elevation="0" class="summary-card pa-4 text-center">
                                    <v-icon icon="mdi-shield-lock-outline" color="#c8b8a2" size="28" class="mb-1" />
                                    <p class="text-caption" style="color:#c8b8a2;">Bloqueos</p>
                                    <p class="text-h6 font-weight-bold" style="color:#c8b8a2;">
                                        Q{{ financialTotals.blockIncome }}
                                    </p>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <v-card rounded="xl" elevation="0" class="summary-card pa-4 text-center total-card">
                                    <v-icon icon="mdi-cash-multiple" color="#1a1008" size="28" class="mb-1" />
                                    <p class="text-caption" style="color:#5a3e28;">Ganancia Neta</p>
                                    <p class="text-h6 font-weight-bold" style="color:#1a1008;">
                                        Q{{ financialTotals.total }}
                                    </p>
                                </v-card>
                            </v-col>
                        </v-row>

                        <!-- Costo por revista (antes: "Pagos por revista") -->
                        <p class="text-body-2 font-weight-bold mb-3" style="color:#e8c97a;">
                            <v-icon icon="mdi-newspaper-variant" size="16" class="mr-1" />
                            Costo por revista
                        </p>
                        <div v-for="mag in financialData.magazines" :key="mag.nameMagazine" class="mb-5">
                            <div class="d-flex align-center gap-2 mb-2">
                                <span class="text-body-2 font-weight-bold" style="color:#f5f0e8;">{{ mag.nameMagazine
                                    }}</span>
                                <v-chip size="x-small" variant="flat" style="background:#b5451b; color:#fff;">
                                    -Q{{mag.payments.reduce((s, p) => s + p.payment, 0)}}
                                </v-chip>
                            </div>
                            <v-table class="report-table rounded-xl">
                                <thead>
                                    <tr>
                                        <th>Pago (Q)</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-if="mag.payments.length === 0">
                                        <td colspan="2" class="text-center py-3" style="color:#c8b8a2;">Sin pagos</td>
                                    </tr>
                                    <tr v-for="(p, pi) in mag.payments" :key="pi">
                                        <td>Q{{ p.payment }}</td>
                                        <td>{{ fmtDate(p.paymentDate) }}</td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </div>

                        <!-- Anuncios globales -->
                        <p class="text-body-2 font-weight-bold mb-3 mt-5" style="color:#e8c97a;">
                            <v-icon icon="mdi-bullhorn-outline" size="16" class="mr-1" />
                            Anuncios
                        </p>
                        <v-table class="report-table rounded-xl mb-5">
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Costo (Q)</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="financialData.ads.length === 0">
                                    <td colspan="3" class="text-center py-3" style="color:#c8b8a2;">Sin anuncios</td>
                                </tr>
                                <tr v-for="(a, ai) in financialData.ads" :key="ai">
                                    <td>{{ a.adTypeName }}</td>
                                    <td>Q{{ a.cost }}</td>
                                    <td>{{ fmtDate(a.date) }}</td>
                                </tr>
                            </tbody>
                        </v-table>

                        <!-- Bloqueos globales -->
                        <p class="text-body-2 font-weight-bold mb-3" style="color:#e8c97a;">
                            <v-icon icon="mdi-shield-lock-outline" size="16" class="mr-1" />
                            Bloqueos de anuncios
                        </p>
                        <v-table class="report-table rounded-xl">
                            <thead>
                                <tr>
                                    <th>Editor</th>
                                    <th>Pago (Q)</th>
                                    <th>Fecha inicio</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="financialData.adBlocks.length === 0">
                                    <td colspan="3" class="text-center py-3" style="color:#c8b8a2;">Sin bloqueos</td>
                                </tr>
                                <tr v-for="(b, bi) in financialData.adBlocks" :key="bi">
                                    <td>{{ b.typeAdvertisementName }}</td>
                                    <td>Q{{ b.payment }}</td>
                                    <td>{{ fmtDate(b.startDate) }}</td>
                                </tr>
                            </tbody>
                        </v-table>
                    </template>
                </v-window-item>

                <!-- ════ ANUNCIOS ════ -->
                <v-window-item value="ads">
                    <div v-if="!hasData.ads" class="empty-state">
                        <v-icon icon="mdi-bullhorn-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">
                            Presiona <strong>Generar</strong> para cargar el reporte
                        </p>
                    </div>
                    <template v-else>
                        <!-- Filtro por tipo -->
                        <v-row dense class="mb-4">
                            <v-col cols="12" sm="4">
                                <v-select v-model="adTypeFilter" :items="adTypeOptions"
                                    label="Filtrar por tipo de anuncio" variant="outlined" density="compact"
                                    class="report-input" clearable placeholder="Todos los tipos" />
                            </v-col>
                            <v-col cols="12" sm="8" class="d-flex align-center">
                                <v-chip v-if="adTypeFilter" size="small" variant="flat" closable
                                    style="background:#3d2f20; color:#e8c97a;" @click:close="adTypeFilter = ''">
                                    {{ adTypeFilter }}
                                </v-chip>
                                <span v-if="adsFiltered.length !== adsRaw.length" class="text-caption ml-2"
                                    style="color:#c8b8a2;">
                                    Mostrando {{ adsFiltered.length }} de {{ adsRaw.length }}
                                </span>
                            </v-col>
                        </v-row>

                        <div v-if="adsFiltered.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin resultados para los filtros aplicados</p>
                        </div>
                        <v-table v-else class="report-table rounded-xl">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tipo</th>
                                    <th>Costo (Q)</th>
                                    <th>Fecha</th>
                                    <th>Links</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="ad in adsFiltered" :key="ad.idAd">
                                    <td>{{ ad.idAd }}</td>
                                    <td>{{ ad.nameTypeAd }}</td>
                                    <td>Q{{ ad.cost }}</td>
                                    <td>{{ fmtDate(ad.dateAd) }}</td>
                                    <td>
                                        <v-chip size="x-small" variant="flat"
                                            style="background:#3d2f20; color:#c8b8a2;">
                                            {{ ad.links.length }} link(s)
                                        </v-chip>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                        <v-card v-if="adsFiltered.length > 0" rounded="xl" elevation="0"
                            class="finance-chip pa-4 d-flex align-center justify-space-between mt-4">
                            <span class="text-body-2 font-weight-bold" style="color:#c8b8a2;">
                                Total de ingresos por anuncios
                            </span>
                            <span class="text-h6 font-weight-bold" style="color:#e8c97a;">
                                Q{{adsFiltered.reduce((s, a) => s + a.cost, 0)}}
                            </span>
                        </v-card>
                    </template>
                </v-window-item>

                <!-- ════ POR ANUNCIANTE ════ -->
                <v-window-item value="advertisers">
                    <div v-if="!hasData.advertisers" class="empty-state">
                        <v-icon icon="mdi-account-tie-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">
                            Presiona <strong>Generar</strong> para cargar el reporte
                        </p>
                    </div>
                    <template v-else>
                        <!-- Filtro por anunciante -->
                        <v-row dense class="mb-4">
                            <v-col cols="12" sm="4">
                                <v-select v-model="advertiserFilter" :items="advertiserOptions"
                                    label="Filtrar por anunciante" variant="outlined" density="compact"
                                    class="report-input" clearable placeholder="Todos los anunciantes" />
                            </v-col>
                            <v-col cols="12" sm="8" class="d-flex align-center">
                                <span v-if="advertiserFilter && advertisersFiltered.length !== advertisersRaw.length"
                                    class="text-caption ml-2" style="color:#c8b8a2;">
                                    Mostrando {{ advertisersFiltered.length }} de {{ advertisersRaw.length }}
                                </span>
                            </v-col>
                        </v-row>

                        <div v-if="advertisersFiltered.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin resultados</p>
                        </div>
                        <div v-for="adv in advertisersFiltered" :key="adv.advertiserName" class="mb-6">
                            <div class="d-flex align-center gap-2 mb-2">
                                <v-icon icon="mdi-account-tie-outline" color="#e8c97a" />
                                <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">
                                    {{ adv.advertiserName }}
                                </span>
                                <v-spacer />
                                <v-chip size="small" variant="flat" style="background:#4caf50; color:#fff;">
                                    Total: Q{{adv.advertisements.reduce((s, a) => s + a.totalCost, 0)}}
                                </v-chip>
                            </div>
                            <v-table class="report-table rounded-xl">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Tipo</th>
                                        <th>Costo Total (Q)</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-if="adv.advertisements.length === 0">
                                        <td colspan="4" class="text-center py-3" style="color:#c8b8a2;">Sin anuncios
                                        </td>
                                    </tr>
                                    <tr v-for="a in adv.advertisements" :key="a.id">
                                        <td>{{ a.id }}</td>
                                        <td>{{ a.adTypeName }}</td>
                                        <td>Q{{ a.totalCost }}</td>
                                        <td>{{ fmtDate(a.creationDate) }}</td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </div>
                    </template>
                </v-window-item>

                <!-- ════ TOP 5 SUSCRIPCIONES ════ -->
                <v-window-item value="topSubs">
                    <div v-if="!hasData.topSubs" class="empty-state">
                        <v-icon icon="mdi-podium-gold" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">Presiona <strong>Generar</strong> para cargar el reporte</p>
                    </div>
                    <template v-else>
                        <div v-if="topSubsSorted.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin datos disponibles</p>
                        </div>
                        <div v-else>
                            <div class="d-flex align-center gap-2 mb-4">
                                <span class="text-caption" style="color:#c8b8a2;">
                                    Las <strong style="color:#e8c97a;">5 revistas</strong> con más suscripciones
                                    en el período seleccionado
                                </span>
                            </div>
                            <div v-for="(mag, rank) in topSubsSorted" :key="mag.idMagazine" class="mb-6">
                                <div class="d-flex align-center gap-3 mb-2">
                                    <div class="rank-badge" :class="`rank-${rank + 1}`">{{ rank + 1 }}</div>
                                    <v-icon icon="mdi-newspaper-variant" color="#e8c97a" />
                                    <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">
                                        {{ mag.nameMagazine }}
                                    </span>
                                    <v-chip size="x-small" variant="flat" style="background:#4caf50; color:#fff;">
                                        {{ mag.subscriptions.length }} suscripciones
                                    </v-chip>
                                </div>
                                <v-table class="report-table rounded-xl" fixed-header height="260">
                                    <thead>
                                        <tr>
                                            <th>Suscriptor</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(s, si) in mag.subscriptions" :key="si">
                                            <td>{{ s.name }}</td>
                                            <td>{{ fmtDate(s.subscriptionDate) }}</td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </div>
                        </div>
                    </template>
                </v-window-item>

                <!-- ════ TOP 5 COMENTARIOS ════ -->
                <v-window-item value="topComments">
                    <div v-if="!hasData.topComments" class="empty-state">
                        <v-icon icon="mdi-comment-star-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">Presiona <strong>Generar</strong> para cargar el reporte</p>
                    </div>
                    <template v-else>
                        <div v-if="topCommentsSorted.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin datos disponibles</p>
                        </div>
                        <div v-else>
                            <div class="d-flex align-center gap-2 mb-4">
                                <span class="text-caption" style="color:#c8b8a2;">
                                    Las <strong style="color:#e8c97a;">5 revistas</strong> con más comentarios
                                    en el período seleccionado
                                </span>
                            </div>
                            <div v-for="(mag, rank) in topCommentsSorted" :key="mag.idMagazine" class="mb-6">
                                <div class="d-flex align-center gap-3 mb-2">
                                    <div class="rank-badge" :class="`rank-${rank + 1}`">{{ rank + 1 }}</div>
                                    <v-icon icon="mdi-newspaper-variant" color="#e8c97a" />
                                    <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">
                                        {{ mag.nameMagazine }}
                                    </span>
                                    <v-chip size="x-small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                                        {{ mag.comments.length }} comentarios
                                    </v-chip>
                                </div>
                                <!-- Tabla con 3 columnas: Usuario / Comentario / Fecha -->
                                <v-table class="report-table rounded-xl" fixed-header height="260">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Comentario</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(c, ci) in mag.comments" :key="ci">
                                            <td>{{ c.name }}</td>
                                            <td style="max-width:320px; white-space:normal; word-break:break-word;">
                                                {{ c.comment }}
                                            </td>
                                            <td>{{ fmtDate(c.commentDate) }}</td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </div>
                        </div>
                    </template>
                </v-window-item>

            </v-window>
        </v-container>
    </v-app>
</template>

<style scoped>
.filter-card {
    background: #2a1e12 !important;
    border: 1px solid #3d2f20;
}

.report-table {
    background: #2a1e12 !important;
}

.report-table :deep(thead tr th) {
    background: #3d2f20 !important;
    color: #e8c97a !important;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #5a3e28 !important;
}

.report-table :deep(tbody tr td) {
    color: #f5f0e8;
    border-bottom: 1px solid #2d1e0e !important;
    font-size: 0.875rem;
}

.report-table :deep(tbody tr:hover td) {
    background: #3d2f20 !important;
}

.tabs-bar :deep(.v-tab) {
    color: #c8b8a2 !important;
    font-size: 0.85rem;
}

.tabs-bar :deep(.v-tab--selected) {
    color: #e8c97a !important;
    font-weight: 600;
}

.btn-primary {
    background: #e8c97a !important;
    color: #1a1008 !important;
    font-weight: 600;
}

.finance-chip {
    background: #3d2f20 !important;
    border: 1px solid #5a3e28;
}

.summary-card {
    background: #2a1e12 !important;
    border: 1px solid #3d2f20;
}

.total-card {
    background: #e8c97a !important;
    border: none !important;
}

.empty-state {
    text-align: center;
    padding: 60px 0;
}

.report-input :deep(.v-field__outline) {
    border-color: #5a3e28 !important;
}

.report-input :deep(label) {
    color: #c8b8a2 !important;
}

.report-input :deep(input),
.report-input :deep(.v-select__selection-text) {
    color: #f5f0e8 !important;
}

.rank-badge {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
}

.rank-1 {
    background: #ffd700;
    color: #1a1008;
}

.rank-2 {
    background: #c0c0c0;
    color: #1a1008;
}

.rank-3 {
    background: #cd7f32;
    color: #fff;
}

.rank-4,
.rank-5 {
    background: #3d2f20;
    color: #e8c97a;
    border: 1px solid #5a3e28;
}
</style>