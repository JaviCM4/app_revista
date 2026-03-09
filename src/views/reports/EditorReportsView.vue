<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { reportService } from '@/services/reports/report.service'
import type { FirstReportResponse } from '@/types/reports/one_nine/FirstReportResponse'
import type { SecondReportResponse } from '@/types/reports/two_eight/SecondReportResponse'
import type { ThirdReportResponse } from '@/types/reports/three/ThirdReportResponse'
import type { FourthReportResponse } from '@/types/reports/four/FourthReportResponse'

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
type TabKey = 'comments' | 'subscriptions' | 'likes' | 'payments'
const tab = ref<TabKey>('comments')
const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'comments', label: 'Comentarios', icon: 'mdi-comment-text-outline' },
    { key: 'subscriptions', label: 'Suscripciones', icon: 'mdi-account-star-outline' },
    { key: 'likes', label: 'Top 5 Likes', icon: 'mdi-heart-outline' },
    { key: 'payments', label: 'Pagos', icon: 'mdi-cash-multiple' },
]

// ── Filtros ───────────────────────────────────────────────────────────────────
const startDate = ref<string>('')
const endDate = ref<string>('')
const magFilter = ref<string>('')
const dateError = ref<string>('')

watch(tab, () => { magFilter.value = '' })

function validateDates(): boolean {
    dateError.value = ''
    if (startDate.value && endDate.value && startDate.value > endDate.value) {
        dateError.value = 'La fecha de inicio debe ser anterior a la de fin'
        return false
    }
    return true
}

// ── Datos crudos ──────────────────────────────────────────────────────────────
const commentsRaw = ref<FirstReportResponse[]>([])
const subscriptionsRaw = ref<SecondReportResponse[]>([])
const likesRaw = ref<ThirdReportResponse[]>([])
const paymentsRaw = ref<FourthReportResponse[]>([])
const loading = ref(false)
const hasData = reactive<Record<TabKey, boolean>>({
    comments: false, subscriptions: false, likes: false, payments: false,
})

// ── Opciones de revista ───────────────────────────────────────────────────────
const magazineOptions = computed<string[]>(() => {
    const raw: { nameMagazine: string }[] =
        tab.value === 'comments' ? commentsRaw.value :
            tab.value === 'subscriptions' ? subscriptionsRaw.value :
                tab.value === 'likes' ? likesRaw.value :
                    paymentsRaw.value
    return [...new Set(raw.map(d => d.nameMagazine))]
})

// ── Datos filtrados ───────────────────────────────────────────────────────────
function byMag<T extends { nameMagazine: string }>(arr: T[]): T[] {
    return magFilter.value ? arr.filter(d => d.nameMagazine === magFilter.value) : arr
}

const commentsFiltered = computed(() => byMag(commentsRaw.value))
const subscriptionsFiltered = computed(() => byMag(subscriptionsRaw.value))
const paymentsFiltered = computed(() => byMag(paymentsRaw.value))
const likesFiltered = computed(() => {
    if (magFilter.value) return likesRaw.value.filter(d => d.nameMagazine === magFilter.value)
    return [...likesRaw.value].sort((a, b) => b.likes.length - a.likes.length).slice(0, 5)
})

// ── Totales ───────────────────────────────────────────────────────────────────
const subTotal = computed(() =>
    subscriptionsFiltered.value.reduce((s, m) => s + m.subscriptions.length, 0)
)
const payTotal = computed(() =>
    paymentsFiltered.value.reduce((s, m) =>
        s + m.paymentReports.reduce((ss, p) => ss + p.payment, 0)
        + m.adBlocks.reduce((ss, b) => ss + b.payment, 0), 0)
)
const magPayTotal = (mag: FourthReportResponse) =>
    mag.paymentReports.reduce((s, p) => s + p.payment, 0)
    + mag.adBlocks.reduce((s, b) => s + b.payment, 0)

// ── Carga ─────────────────────────────────────────────────────────────────────
async function loadReport() {
    if (!validateDates()) return
    loading.value = true
    magFilter.value = ''
    const sd = startDate.value || null
    const ed = endDate.value || null
    try {
        switch (tab.value) {
            case 'comments':
                commentsRaw.value = await reportService.getCommentsReport(sd, ed)
                hasData.comments = true
                break
            case 'subscriptions':
                subscriptionsRaw.value = await reportService.getSubscriptionsReport(sd, ed)
                hasData.subscriptions = true
                break
            case 'likes':
                likesRaw.value = await reportService.getLikesReport(sd, ed)
                hasData.likes = true
                break
            case 'payments':
                paymentsRaw.value = await reportService.getPaymentsReport(sd, ed)
                hasData.payments = true
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
    if (magFilter.value) doc.text(`Revista: ${magFilter.value}`, 14, 35)
}
const startY = () => magFilter.value ? 41 : 36

function downloadPdf() {
    if (!hasData[tab.value]) { notify('Primero genera el reporte', 'error'); return }
    switch (tab.value) {
        case 'comments': pdfComments(); break
        case 'subscriptions': pdfSubscriptions(); break
        case 'likes': pdfLikes(); break
        case 'payments': pdfPayments(); break
    }
}

function pdfComments() {
    // Landscape para que la columna Comentario tenga espacio suficiente
    const doc = newDoc(true); pdfHeader(doc, 'Reporte de Comentarios por Revista')
    let y = startY()
    for (const mag of commentsFiltered.value) {
        if (y > 170) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setTextColor(40)
        doc.text(`${mag.nameMagazine}  (${mag.comments.length} comentarios)`, 14, y); y += 5
        autoTable(doc, {
            startY: y,
            head: [['Usuario', 'Comentario', 'Fecha']],
            body: mag.comments.map(c => [c.name, c.comment, fmtDate(c.commentDate)]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [45, 30, 14] },
            columnStyles: { 1: { cellWidth: 160 } },
            margin: { left: 18 },
        })
        y = (doc as DocWT).lastAutoTable.finalY + 8
    }
    doc.save(`comentarios_${Date.now()}.pdf`)
}

function pdfSubscriptions() {
    const doc = newDoc(); pdfHeader(doc, 'Reporte de Suscripciones')
    let y = startY()
    for (const mag of subscriptionsFiltered.value) {
        if (y > 258) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setTextColor(40)
        doc.text(`${mag.nameMagazine}  (${mag.subscriptions.length} suscripciones)`, 14, y); y += 5
        autoTable(doc, {
            startY: y, head: [['Suscriptor', 'Fecha de Suscripción']],
            body: mag.subscriptions.map(s => [s.name, fmtDate(s.subscriptionDate)]),
            styles: { fontSize: 8 }, headStyles: { fillColor: [45, 30, 14] }, margin: { left: 18 },
        })
        y = (doc as DocWT).lastAutoTable.finalY + 8
    }
    doc.setFontSize(11); doc.setTextColor(40)
    doc.text(`Total de suscripciones: ${subTotal.value}`, 14, y + 2)
    doc.save(`suscripciones_${Date.now()}.pdf`)
}

function pdfLikes() {
    const doc = newDoc(); pdfHeader(doc, 'Top 5 Revistas Más Gustadas')
    let y = startY()
    likesFiltered.value.forEach((mag, i) => {
        if (y > 258) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setTextColor(40)
        const prefix = magFilter.value ? '' : `#${i + 1}  `
        doc.text(`${prefix}${mag.nameMagazine}  (${mag.likes.length} likes)`, 14, y); y += 5
        autoTable(doc, {
            startY: y, head: [['Usuario', 'Fecha']],
            body: mag.likes.map(l => [l.name, fmtDate(l.likeDate)]),
            styles: { fontSize: 8 }, headStyles: { fillColor: [45, 30, 14] }, margin: { left: 18 },
        })
        y = (doc as DocWT).lastAutoTable.finalY + 8
    })
    doc.save(`top5-likes_${Date.now()}.pdf`)
}

function pdfPayments() {
    const doc = newDoc(true); pdfHeader(doc, 'Reporte de Pagos por Revista')
    let y = startY()
    for (const mag of paymentsFiltered.value) {
        if (y > 170) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setTextColor(40)
        doc.text(`${mag.nameMagazine}  —  Total: Q${magPayTotal(mag)}`, 14, y); y += 5
        if (mag.paymentReports.length) {
            autoTable(doc, {
                startY: y, head: [['Pago (Q)', 'Fecha']],
                body: mag.paymentReports.map(p => [`Q${p.payment}`, fmtDate(p.paymentDate)]),
                styles: { fontSize: 8 }, headStyles: { fillColor: [45, 30, 14] }, margin: { left: 18 },
            })
            y = (doc as DocWT).lastAutoTable.finalY + 4
        }
        if (mag.adBlocks.length) {
            autoTable(doc, {
                startY: y, head: [['Tipo Anuncio', 'Pago (Q)', 'Fecha']],
                body: mag.adBlocks.map(b => [b.typeAdvertisementName, `Q${b.payment}`, fmtDate(b.startDate)]),
                styles: { fontSize: 8 }, headStyles: { fillColor: [80, 60, 30] }, margin: { left: 18 },
            })
            y = (doc as DocWT).lastAutoTable.finalY + 8
        }
    }
    doc.setFontSize(12); doc.setTextColor(40)
    doc.text(`TOTAL GENERAL: Q${payTotal.value}`, 14, y + 4)
    doc.save(`pagos_${Date.now()}.pdf`)
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
                        <v-icon icon="mdi-file-chart-outline" color="#e8c97a" class="mr-2" />
                        Reportes del Editor
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">
                        Estadísticas de tus revistas en un intervalo de tiempo
                    </p>
                </div>
            </div>

            <!-- ── Panel de filtros ── -->
            <v-card rounded="xl" elevation="0" class="filter-card mb-5 pa-5">
                <p class="text-body-2 font-weight-bold mb-4" style="color:#e8c97a;">
                    <v-icon icon="mdi-filter-outline" size="16" class="mr-1" />
                    Filtros
                    <span class="text-caption font-weight-regular ml-2" style="color:#c8b8a2;">
                        (las fechas son opcionales)
                    </span>
                </p>
                <v-row dense align="center">
                    <v-col cols="12" sm="3">
                        <v-text-field v-model="startDate" label="Fecha de inicio" type="date" variant="outlined"
                            density="compact" class="report-input" clearable />
                    </v-col>
                    <v-col cols="12" sm="3">
                        <v-text-field v-model="endDate" label="Fecha de fin" type="date" variant="outlined"
                            density="compact" class="report-input" clearable />
                    </v-col>
                    <v-col cols="12" sm="3">
                        <v-select v-model="magFilter" :items="magazineOptions" label="Filtrar por revista"
                            variant="outlined" density="compact" class="report-input" clearable
                            :disabled="!hasData[tab]" placeholder="Todas las revistas" />
                    </v-col>
                    <v-col cols="12" sm="3" class="d-flex gap-2">
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

            <!-- ── Chips de estado ── -->
            <div v-if="hasData[tab]" class="d-flex align-center gap-2 mb-4 flex-wrap">
                <v-chip size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                    <v-icon icon="mdi-calendar-range" size="13" class="mr-1" />
                    {{ periodLabel }}
                </v-chip>
                <v-chip v-if="magFilter" size="small" variant="flat" closable style="background:#3d2f20; color:#c8b8a2;"
                    @click:close="magFilter = ''">
                    <v-icon icon="mdi-newspaper-variant" size="13" class="mr-1" />
                    {{ magFilter }}
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

                <!-- ════ COMENTARIOS ════ -->
                <v-window-item value="comments">
                    <div v-if="!hasData.comments" class="empty-state">
                        <v-icon icon="mdi-comment-search-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">Presiona <strong>Generar</strong> para cargar el reporte</p>
                    </div>
                    <template v-else>
                        <div v-if="commentsFiltered.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin resultados para los filtros aplicados</p>
                        </div>
                        <div v-for="mag in commentsFiltered" :key="mag.idMagazine" class="mb-6">
                            <div class="d-flex align-center gap-2 mb-2">
                                <v-icon icon="mdi-newspaper-variant" color="#e8c97a" />
                                <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">
                                    {{ mag.nameMagazine }}
                                </span>
                                <v-chip size="x-small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                                    {{ mag.comments.length }} comentarios
                                </v-chip>
                            </div>
                            <!-- 3 columnas: Usuario / Comentario / Fecha -->
                            <v-table class="report-table rounded-xl" fixed-header height="300">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Comentario</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-if="mag.comments.length === 0">
                                        <td colspan="3" class="text-center py-4" style="color:#c8b8a2;">Sin comentarios
                                        </td>
                                    </tr>
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
                    </template>
                </v-window-item>

                <!-- ════ SUSCRIPCIONES ════ -->
                <v-window-item value="subscriptions">
                    <div v-if="!hasData.subscriptions" class="empty-state">
                        <v-icon icon="mdi-account-search-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">Presiona <strong>Generar</strong> para cargar el reporte</p>
                    </div>
                    <template v-else>
                        <div v-if="subscriptionsFiltered.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin resultados para los filtros aplicados</p>
                        </div>
                        <template v-else>
                            <div v-for="mag in subscriptionsFiltered" :key="mag.idMagazine" class="mb-6">
                                <div class="d-flex align-center gap-2 mb-2">
                                    <v-icon icon="mdi-newspaper-variant" color="#e8c97a" />
                                    <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">{{
                                        mag.nameMagazine }}</span>
                                    <v-chip size="x-small" variant="flat" style="background:#4caf50; color:#fff;">
                                        {{ mag.subscriptions.length }} suscripciones
                                    </v-chip>
                                </div>
                                <v-table class="report-table rounded-xl" fixed-header height="280">
                                    <thead>
                                        <tr>
                                            <th>Suscriptor</th>
                                            <th>Fecha de Suscripción</th>
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
                            <v-card rounded="xl" elevation="0"
                                class="finance-chip pa-4 d-flex align-center justify-space-between mt-2">
                                <span class="text-body-2 font-weight-bold" style="color:#c8b8a2;">
                                    Total de suscripciones
                                </span>
                                <span class="text-h6 font-weight-bold" style="color:#e8c97a;">
                                    {{ subTotal }}
                                </span>
                            </v-card>
                        </template>
                    </template>
                </v-window-item>

                <!-- ════ TOP 5 LIKES ════ -->
                <v-window-item value="likes">
                    <div v-if="!hasData.likes" class="empty-state">
                        <v-icon icon="mdi-heart-search" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">Presiona <strong>Generar</strong> para cargar el reporte</p>
                    </div>
                    <template v-else>
                        <div v-if="!magFilter" class="d-flex align-center gap-2 mb-4">
                            <span class="text-caption" style="color:#c8b8a2;">
                                Las <strong style="color:#e8c97a;">5 revistas</strong>
                                más likeadas, en el período seleccionado
                            </span>
                        </div>
                        <div v-if="likesFiltered.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin resultados para los filtros aplicados</p>
                        </div>
                        <div v-for="(mag, rank) in likesFiltered" :key="mag.idMagazine" class="mb-6">
                            <div class="d-flex align-center gap-3 mb-2">
                                <div v-if="!magFilter" class="rank-badge" :class="`rank-${rank + 1}`">
                                    {{ rank + 1 }}
                                </div>
                                <v-icon icon="mdi-newspaper-variant" color="#e8c97a" />
                                <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">
                                    {{ mag.nameMagazine }}
                                </span>
                                <v-chip size="x-small" variant="flat" style="background:#b5451b; color:#fff;">
                                    <v-icon icon="mdi-heart" size="12" class="mr-1" />
                                    {{ mag.likes.length }} likes
                                </v-chip>
                            </div>
                            <v-table class="report-table rounded-xl" fixed-header height="260">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-if="mag.likes.length === 0">
                                        <td colspan="2" class="text-center py-4" style="color:#c8b8a2;">Sin likes</td>
                                    </tr>
                                    <tr v-for="(l, li) in mag.likes" :key="li">
                                        <td>{{ l.name }}</td>
                                        <td>{{ fmtDate(l.likeDate) }}</td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </div>
                    </template>
                </v-window-item>

                <!-- ════ PAGOS ════ -->
                <v-window-item value="payments">
                    <div v-if="!hasData.payments" class="empty-state">
                        <v-icon icon="mdi-cash-search" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p style="color:#c8b8a2;">Presiona <strong>Generar</strong> para cargar el reporte</p>
                    </div>
                    <template v-else>
                        <div v-if="paymentsFiltered.length === 0" class="text-center py-8">
                            <p style="color:#c8b8a2;">Sin resultados para los filtros aplicados</p>
                        </div>
                        <template v-else>
                            <div v-for="mag in paymentsFiltered" :key="mag.idMagazine" class="mb-6">
                                <div class="d-flex align-center gap-2 mb-3">
                                    <v-icon icon="mdi-newspaper-variant" color="#e8c97a" />
                                    <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">
                                        {{ mag.nameMagazine }}
                                    </span>
                                    <v-spacer />
                                    <v-chip size="small" variant="flat" style="background:#4caf50; color:#fff;">
                                        Total: Q{{ magPayTotal(mag) }}
                                    </v-chip>
                                </div>

                                <p class="text-caption mb-1" style="color:#c8b8a2;">Pagos de suscripción</p>
                                <v-table class="report-table rounded-xl mb-3">
                                    <thead>
                                        <tr>
                                            <th>Monto (Q)</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-if="mag.paymentReports.length === 0">
                                            <td colspan="2" class="text-center py-3" style="color:#c8b8a2;">Sin pagos
                                            </td>
                                        </tr>
                                        <tr v-for="(p, pi) in mag.paymentReports" :key="pi">
                                            <td>Q{{ p.payment }}</td>
                                            <td>{{ fmtDate(p.paymentDate) }}</td>
                                        </tr>
                                    </tbody>
                                </v-table>

                                <p class="text-caption mb-1" style="color:#c8b8a2;">Bloqueos de anuncios</p>
                                <v-table class="report-table rounded-xl">
                                    <thead>
                                        <tr>
                                            <th>Tipo de Anuncio</th>
                                            <th>Pago (Q)</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-if="mag.adBlocks.length === 0">
                                            <td colspan="3" class="text-center py-3" style="color:#c8b8a2;">Sin bloqueos
                                            </td>
                                        </tr>
                                        <tr v-for="(b, bi) in mag.adBlocks" :key="bi">
                                            <td>{{ b.typeAdvertisementName }}</td>
                                            <td>Q{{ b.payment }}</td>
                                            <td>{{ fmtDate(b.startDate) }}</td>
                                        </tr>
                                    </tbody>
                                </v-table>
                                <v-divider class="mt-5" style="border-color:#3d2f20;" />
                            </div>

                            <v-card rounded="xl" elevation="0"
                                class="finance-chip pa-4 d-flex align-center justify-space-between mt-3">
                                <span class="text-body-2 font-weight-bold" style="color:#c8b8a2;">
                                    Total general de pagos
                                </span>
                                <span class="text-h6 font-weight-bold" style="color:#4caf50;">
                                    Q{{ payTotal }}
                                </span>
                            </v-card>
                        </template>
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