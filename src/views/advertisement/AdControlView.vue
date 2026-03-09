<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { advertisementService } from '@/services/advertisement/advertisement.service'
import { suggestedCostService } from '@/services/suggested/suggested.service'
import type { AdFindResponse } from '@/types/advertisement/AdFindResponse'
import type { AdCreateRequest } from '@/types/advertisement/AdCreateRequest'
import type { SuggestedCostResponse } from '@/types/suggested/SuggestedCostResponse'

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = reactive({ show: false, message: '', color: 'success' as string, icon: '' })
const notifyMap = {
    success: { color: 'success', icon: 'mdi-check-circle-outline' },
    error: { color: 'error', icon: 'mdi-alert-circle-outline' },
    warning: { color: 'warning', icon: 'mdi-alert-outline' },
} as const
function notify(message: string, type: keyof typeof notifyMap = 'success') {
    Object.assign(snackbar, { show: true, message, ...notifyMap[type] })
}
function errorMsg(e: unknown) {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
    return 'Ocurrió un error inesperado'
}

// ── Constantes de tipo ────────────────────────────────────────────────────────
const AD_ICONS: Record<number, string> = { 1: 'mdi-text', 2: 'mdi-image-text', 3: 'mdi-play-circle-outline' }
const AD_LABELS: Record<number, string> = { 1: 'Solo texto', 2: 'Imagen + Texto', 3: 'Video' }
const AD_COLORS: Record<number, string> = { 1: '#e8c97a', 2: '#4caf50', 3: '#b5451b' }

// ── Tabs principales ──────────────────────────────────────────────────────────
const mainTab = ref<'list' | 'create'>('list')

// ── Filtros ───────────────────────────────────────────────────────────────────
const statusFilter = ref<'Activo' | 'Inactivo'>('Activo')
const typeFilter = ref<number | null>(null)

// ── Anuncios ──────────────────────────────────────────────────────────────────
const ads = ref<AdFindResponse[]>([])
const loading = ref(false)
const disabling = ref<number | null>(null)

const filteredAds = computed(() =>
    ads.value.filter(a => {
        const matchStatus = a.adStatusName === statusFilter.value
        const matchType = typeFilter.value === null || a.idAdType === typeFilter.value
        return matchStatus && matchType
    })
)
const activeCount = computed(() => ads.value.filter(a => a.adStatusName === 'Activo').length)
const inactiveCount = computed(() => ads.value.filter(a => a.adStatusName === 'Inactivo').length)

async function loadAds() {
    loading.value = true
    try {
        ads.value = await advertisementService.findAllByAdvertiser()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

// ── Deshabilitar ──────────────────────────────────────────────────────────────
const confirmDialog = ref(false)
const selectedAd = ref<AdFindResponse | null>(null)

function openDisableConfirm(ad: AdFindResponse) {
    selectedAd.value = ad
    confirmDialog.value = true
}
function closeConfirm() {
    confirmDialog.value = false
    selectedAd.value = null
}
async function confirmDisable() {
    if (!selectedAd.value) return
    const ad = selectedAd.value
    disabling.value = ad.idAdvertisement
    closeConfirm()
    try {
        await advertisementService.disableAd(ad.idAdvertisement)
        const found = ads.value.find(a => a.idAdvertisement === ad.idAdvertisement)
        if (found) found.adStatusName = 'Inactivo'
        notify('Anuncio deshabilitado', 'success')
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        disabling.value = null
    }
}

// ── Costos sugeridos ──────────────────────────────────────────────────────────
const suggestedCosts = ref<SuggestedCostResponse[]>([])
const loadingCosts = ref(false)
const selectedCostId = ref<number | null>(null)

const selectedPlan = computed(() =>
    suggestedCosts.value.find(c => c.idSuggestedCost === selectedCostId.value) ?? null
)

const computedExpiration = computed(() => {
    if (!selectedPlan.value) return null
    const d = new Date()
    d.setDate(d.getDate() + selectedPlan.value.days)
    return d
})

const formattedExpiration = computed(() => {
    if (!computedExpiration.value) return '—'
    return computedExpiration.value.toLocaleDateString('es-GT', {
        day: 'numeric', month: 'long', year: 'numeric'
    })
})

async function loadSuggestedCosts() {
    loadingCosts.value = true
    try {
        suggestedCosts.value = await suggestedCostService.findAll()
        if (suggestedCosts.value.length > 0) {
            selectedCostId.value = suggestedCosts.value[0]?.idSuggestedCost ?? null
        }
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loadingCosts.value = false
    }
}

// ── Helpers de contenido inline ───────────────────────────────────────────────
function isImage(link: string): boolean {
    return /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(link)
}
function isYouTube(link: string): boolean {
    return link.includes('youtube.com') || link.includes('youtu.be')
}
function isVideo(link: string): boolean {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(link)
}
function youtubeThumb(link: string): string {
    const match = link.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : ''
}

// ── Crear anuncio ─────────────────────────────────────────────────────────────
const createForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const creating = ref(false)

const newAd = reactive({ idTypeAd: 1, link1: '', link2: '' })

const required = (v: string | null) => (!!v && v.trim() !== '') || 'Campo obligatorio'
const validUrl = (v: string) => { try { new URL(v); return true } catch { return 'Debe ser una URL válida' } }

async function handleCreate() {
    const { valid } = await createForm.value!.validate()
    if (!valid) return
    if (!selectedPlan.value) { notify('Selecciona un plan', 'warning'); return }

    creating.value = true
    const detail: string[] = newAd.idTypeAd === 2
        ? [newAd.link1.trim(), newAd.link2.trim()]
        : [newAd.link1.trim()]

    const payload: AdCreateRequest = {
        idTypeAd: newAd.idTypeAd,
        detail,
        totalCost: selectedPlan.value.cost,
        expirationDate: computedExpiration.value!,
    }
    try {
        await advertisementService.createAd(payload)
        notify('Anuncio creado correctamente', 'success')
        Object.assign(newAd, { idTypeAd: 1, link1: '', link2: '' })
        if (suggestedCosts.value.length > 0) selectedCostId.value = suggestedCosts.value[0]?.idSuggestedCost ?? null
        mainTab.value = 'list'
        await loadAds()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        creating.value = false
    }
}

function adTypeHint(t: number): string {
    if (t === 1) return 'Texto descriptivo'
    if (t === 2) return '1 imagen + 1 link'
    return '1 link de video'
}

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
}
function isExpired(date: Date | string) {
    return new Date(date) < new Date()
}

onMounted(async () => {
    await Promise.all([loadAds(), loadSuggestedCosts()])
})
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

            <!-- Encabezado -->
            <div class="d-flex align-center justify-space-between mb-5 flex-wrap gap-3">
                <div>
                    <p class="text-h5 font-weight-bold mb-1" style="color:#f5f0e8;">
                        <v-icon icon="mdi-bullhorn-variant-outline" color="#e8c97a" class="mr-2" />
                        Mis anuncios
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">Gestiona y publica tus anuncios en las revistas</p>
                </div>
                <div class="d-flex gap-2">
                    <v-chip size="small" variant="flat"
                        style="background:#4caf5022; color:#4caf50; border:1px solid #4caf5055;">
                        <v-icon icon="mdi-circle" size="8" class="mr-1" />{{ activeCount }} activos
                    </v-chip>
                    <v-chip size="small" variant="flat" style="background:#3d2f20; color:#c8b8a2;">
                        {{ inactiveCount }} inactivos
                    </v-chip>
                </div>
            </div>

            <!-- Tabs principales -->
            <v-tabs v-model="mainTab" class="mb-5 tabs-bar" color="#e8c97a">
                <v-tab value="list" prepend-icon="mdi-view-grid-outline">Mis anuncios</v-tab>
                <v-tab value="create" prepend-icon="mdi-plus-circle-outline">Crear anuncio</v-tab>
            </v-tabs>

            <v-window v-model="mainTab">

                <!-- ══ TAB 1 — LISTADO ══ -->
                <v-window-item value="list">

                    <!-- Filtros -->
                    <div class="d-flex align-center gap-3 mb-5 flex-wrap">
                        <div class="d-flex rounded-lg overflow-hidden status-toggle">
                            <button class="status-btn" :class="{ active: statusFilter === 'Activo' }"
                                @click="statusFilter = 'Activo'">
                                <v-icon icon="mdi-circle" size="10" class="mr-1" />Activos
                            </button>
                            <button class="status-btn" :class="{ active: statusFilter === 'Inactivo' }"
                                @click="statusFilter = 'Inactivo'">
                                <v-icon icon="mdi-circle-off-outline" size="10" class="mr-1" />Inactivos
                            </button>
                        </div>

                        <v-divider vertical style="border-color:#3d2f20; height:32px;" />

                        <div class="d-flex gap-2 flex-wrap">
                            <v-chip size="small" variant="tonal" rounded="lg" class="cursor-pointer" :style="typeFilter === null
                                ? 'background:#e8c97a22; color:#e8c97a; border:1px solid #e8c97a55;'
                                : 'color:#c8b8a2;'" @click="typeFilter = null">Todos</v-chip>
                            <v-chip v-for="t in [1, 2, 3]" :key="t" size="small" variant="tonal" rounded="lg"
                                :prepend-icon="AD_ICONS[t]" class="cursor-pointer" :style="typeFilter === t
                                    ? `background:${AD_COLORS[t]}22; color:${AD_COLORS[t]}; border:1px solid ${AD_COLORS[t]}55;`
                                    : 'color:#c8b8a2;'" @click="typeFilter = t">{{ AD_LABELS[t] }}</v-chip>
                        </div>

                        <v-spacer />
                        <span class="text-caption" style="color:#c8b8a2;">
                            {{ filteredAds.length }} resultado{{ filteredAds.length !== 1 ? 's' : '' }}
                        </span>
                    </div>

                    <div v-if="loading" class="text-center py-12">
                        <v-progress-circular indeterminate color="#e8c97a" size="48" />
                    </div>

                    <div v-else-if="filteredAds.length === 0" class="text-center py-12">
                        <v-icon icon="mdi-bullhorn-outline" size="56" color="#c8b8a2" class="mb-3 d-block" />
                        <p class="text-body-1 font-weight-bold mb-1" style="color:#f5f0e8;">Sin anuncios</p>
                        <p class="text-body-2 mb-4" style="color:#c8b8a2;">
                            No tienes anuncios {{ statusFilter === 'Activo' ? 'activos' : 'inactivos' }}.
                        </p>
                        <v-btn v-if="statusFilter === 'Activo'" variant="flat" rounded="lg" class="btn-primary"
                            prepend-icon="mdi-plus" @click="mainTab = 'create'">
                            Crear primer anuncio
                        </v-btn>
                    </div>

                    <!-- Grid -->
                    <v-row v-else>
                        <v-col v-for="ad in filteredAds" :key="ad.idAdvertisement" cols="12" sm="6" md="4">
                            <v-card rounded="xl" class="ad-card h-100 d-flex flex-column" elevation="0">

                                <!-- Header -->
                                <div class="px-4 pt-4 pb-3 d-flex align-center gap-2">
                                    <div class="type-badge d-flex align-center gap-1 px-2 py-1 rounded-lg"
                                        :style="`background:${AD_COLORS[ad.idAdType]}18; color:${AD_COLORS[ad.idAdType]};`">
                                        <v-icon :icon="AD_ICONS[ad.idAdType]" size="14" />
                                        <span class="text-caption font-weight-bold">{{ AD_LABELS[ad.idAdType] }}</span>
                                    </div>
                                    <v-spacer />
                                    <div class="d-flex align-center gap-1">
                                        <span class="dot"
                                            :style="ad.adStatusName === 'Activo' ? 'background:#4caf50;' : 'background:#c8b8a2;'" />
                                        <span class="text-caption"
                                            :style="ad.adStatusName === 'Activo' ? 'color:#4caf50;' : 'color:#c8b8a2;'">
                                            {{ ad.adStatusName }}
                                        </span>
                                    </div>
                                </div>

                                <v-divider style="border-color:#3d2f20;" />

                                <v-card-text class="px-4 pt-3 pb-2 flex-grow-1">

                                    <!-- ID y fecha -->
                                    <div class="mb-3">
                                        <span class="text-caption font-weight-bold d-block mb-1" style="color:#c8b8a2;">
                                            <v-icon icon="mdi-identifier" size="13" class="mr-1" />
                                            #{{ ad.idAdvertisement }}
                                        </span>
                                        <span class="text-caption d-flex align-center gap-1"
                                            :style="isExpired(ad.expirationDate) ? 'color:#b5451b;' : 'color:#c8b8a2;'">
                                            <v-icon icon="mdi-calendar-clock-outline" size="13" />
                                            <span>Expira: <strong>{{ formatDate(ad.expirationDate) }}</strong>
                                                <span v-if="isExpired(ad.expirationDate)" style="color:#b5451b;"> ·
                                                    Vencido</span></span>
                                        </span>
                                    </div>

                                    <!-- ── TIPO 1: texto plano ── -->
                                    <template v-if="ad.idAdType === 1">
                                        <div class="content-box text-box">
                                            <v-icon icon="mdi-format-quote-open" size="16" color="#e8c97a"
                                                class="mb-2 d-block" />
                                            <p v-for="(txt, i) in ad.links" :key="i" class="text-body-2 mb-0"
                                                style="color:#f5f0e8; line-height:1.6;">
                                                {{ txt }}
                                            </p>
                                        </div>
                                    </template>

                                    <!-- ── TIPO 2: imagen + link ── -->
                                    <template v-else-if="ad.idAdType === 2">
                                        <div class="content-box image-box">
                                            <img v-if="ad.links[0] && isImage(ad.links[0])" :src="ad.links[0]"
                                                loading="lazy" class="inline-img" alt="Imagen del anuncio" />
                                            <div v-else class="img-placeholder d-flex align-center justify-center">
                                                <v-icon icon="mdi-image-off-outline" color="#c8b8a2" size="28" />
                                            </div>
                                        </div>
                                        <div v-if="ad.links[1]" class="content-box text-box mt-2">
                                            <v-icon icon="mdi-format-quote-open" size="16" color="#4caf50"
                                                class="mb-2 d-block" />
                                            <p class="text-body-2 mb-0" style="color:#f5f0e8; line-height:1.6;">
                                                {{ ad.links[1] }}
                                            </p>
                                        </div>
                                    </template>

                                    <!-- ── TIPO 3: video inline ── -->
                                    <template v-else-if="ad.idAdType === 3">
                                        <div class="content-box video-box">
                                            <!-- YouTube: thumbnail + botón play -->
                                            <template v-if="ad.links[0] && isYouTube(ad.links[0])">
                                                <div class="yt-thumb-wrap">
                                                    <img :src="youtubeThumb(ad.links[0])" loading="lazy"
                                                        class="inline-img" alt="Miniatura video" />
                                                    <a :href="ad.links[0]" target="_blank" rel="noopener"
                                                        class="yt-play-btn">
                                                        <v-icon icon="mdi-play-circle" color="white" size="44" />
                                                    </a>
                                                </div>
                                            </template>
                                            <!-- Video .mp4/.webm: reproductor nativo -->
                                            <template v-else-if="ad.links[0] && isVideo(ad.links[0])">
                                                <video :src="ad.links[0]" controls preload="metadata"
                                                    class="inline-video" />
                                            </template>
                                            <!-- Fallback link clicable -->
                                            <template v-else-if="ad.links[0]">
                                                <div class="d-flex align-center gap-2 pa-3">
                                                    <v-icon icon="mdi-play-circle-outline" color="#b5451b" size="24" />
                                                    <a :href="ad.links[0]" target="_blank" rel="noopener"
                                                        class="text-caption link-anchor" style="color:#b5451b;">
                                                        {{ ad.links[0] }}
                                                    </a>
                                                </div>
                                            </template>
                                        </div>
                                    </template>

                                </v-card-text>

                                <!-- Acciones -->
                                <v-card-actions v-if="ad.adStatusName === 'Activo'" class="px-4 pb-4 pt-1 mt-auto">
                                    <v-spacer />
                                    <v-btn variant="outlined" rounded="lg" size="small"
                                        prepend-icon="mdi-eye-off-outline"
                                        style="border-color:#b5451b !important; color:#b5451b !important;"
                                        :loading="disabling === ad.idAdvertisement" @click="openDisableConfirm(ad)">
                                        Deshabilitar
                                    </v-btn>
                                </v-card-actions>
                                <div v-else class="px-4 pb-4 pt-1 d-flex justify-end">
                                    <span class="text-caption" style="color:#c8b8a2;">
                                        <v-icon icon="mdi-lock-outline" size="13" class="mr-1" />Inactivo — no editable
                                    </span>
                                </div>

                            </v-card>
                        </v-col>
                    </v-row>

                </v-window-item>

                <!-- ══ TAB 2 — CREAR ANUNCIO ══ -->
                <v-window-item value="create">
                    <v-row justify="center" class="mt-2">
                        <v-col cols="12" sm="10" md="7">
                            <v-card rounded="xl" class="ad-card" elevation="0">
                                <v-card-text class="pa-6">

                                    <p class="text-h6 font-weight-bold mb-1" style="color:#f5f0e8;">Nuevo anuncio</p>
                                    <p class="text-body-2 mb-5" style="color:#c8b8a2;">
                                        Elige el tipo, agrega el contenido y selecciona un plan.
                                    </p>

                                    <v-form ref="createForm" @submit.prevent="handleCreate">

                                        <!-- Tipo -->
                                        <p class="text-caption font-weight-bold mb-2" style="color:#c8b8a2;">TIPO DE
                                            ANUNCIO</p>
                                        <div class="d-flex gap-3 mb-5 flex-wrap">
                                            <div v-for="t in [1, 2, 3]" :key="t"
                                                class="type-selector rounded-xl pa-3 d-flex align-center gap-3 cursor-pointer flex-grow-1"
                                                :style="newAd.idTypeAd === t
                                                    ? `border:2px solid ${AD_COLORS[t]}; background:${AD_COLORS[t]}12;`
                                                    : 'border:2px solid #3d2f20; background:#1a1008;'"
                                                @click="newAd.idTypeAd = t; newAd.link2 = ''">
                                                <v-icon :icon="AD_ICONS[t]"
                                                    :color="newAd.idTypeAd === t ? AD_COLORS[t] : '#c8b8a2'"
                                                    size="22" />
                                                <div>
                                                    <p class="text-body-2 font-weight-bold mb-0"
                                                        :style="newAd.idTypeAd === t ? `color:${AD_COLORS[t]};` : 'color:#c8b8a2;'">
                                                        {{ AD_LABELS[t] }}
                                                    </p>
                                                    <p class="text-caption mb-0" style="color:#c8b8a2; font-size:10px;">
                                                        {{ adTypeHint(t) }}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Contenido -->
                                        <p class="text-caption font-weight-bold mb-2" style="color:#c8b8a2;">CONTENIDO
                                        </p>

                                        <v-textarea v-if="newAd.idTypeAd === 1" v-model="newAd.link1"
                                            label="Texto del anuncio *" prepend-inner-icon="mdi-text" variant="outlined"
                                            rounded="lg" base-color="#c8b8a2" color="#e8c97a" bg-color="#1a1008"
                                            :rules="[required]" hide-details="auto" class="mb-3" rows="3" auto-grow
                                            hint="Escribe el mensaje que verán los lectores" persistent-hint />

                                        <template v-if="newAd.idTypeAd === 2">
                                            <v-text-field v-model="newAd.link1" label="URL de destino *"
                                                prepend-inner-icon="mdi-link-variant" variant="outlined" rounded="lg"
                                                base-color="#c8b8a2" color="#4caf50" bg-color="#1a1008"
                                                :rules="[required, validUrl]" hide-details="auto" class="mb-3"
                                                hint="URL a la que apunta el anuncio" persistent-hint />
                                            <v-textarea v-model="newAd.link2" label="Texto o descripción *"
                                                prepend-inner-icon="mdi-text" variant="outlined" rounded="lg"
                                                base-color="#c8b8a2" color="#4caf50" bg-color="#1a1008"
                                                :rules="[required]" hide-details="auto" class="mb-3" rows="3" auto-grow
                                                hint="Escribe el texto o descripción del anuncio" persistent-hint />
                                        </template>

                                        <v-text-field v-if="newAd.idTypeAd === 3" v-model="newAd.link1"
                                            label="URL del video *" prepend-inner-icon="mdi-play-circle-outline"
                                            variant="outlined" rounded="lg" base-color="#c8b8a2" color="#b5451b"
                                            bg-color="#1a1008" :rules="[required, validUrl]" hide-details="auto"
                                            class="mb-3" hint="YouTube, MP4 o cualquier URL de video" persistent-hint />

                                        <v-divider style="border-color:#3d2f20;" class="my-4" />

                                        <!-- Planes de precio -->
                                        <p class="text-caption font-weight-bold mb-3" style="color:#c8b8a2;">PLAN DE
                                            PUBLICACIÓN
                                        </p>

                                        <div v-if="loadingCosts" class="text-center py-4">
                                            <v-progress-circular indeterminate color="#e8c97a" size="28" />
                                        </div>
                                        <p v-else-if="suggestedCosts.length === 0" class="text-caption py-2"
                                            style="color:#c8b8a2;">
                                            No hay planes disponibles.
                                        </p>

                                        <div v-else class="plans-grid mb-4">
                                            <div v-for="plan in suggestedCosts" :key="plan.idSuggestedCost"
                                                class="plan-card rounded-xl pa-3 cursor-pointer" :style="selectedCostId === plan.idSuggestedCost
                                                    ? 'border:2px solid #e8c97a; background:rgba(232,201,122,0.08);'
                                                    : 'border:2px solid #3d2f20; background:#1a1008;'"
                                                @click="selectedCostId = plan.idSuggestedCost">
                                                <div class="d-flex align-center justify-space-between mb-1">
                                                    <span class="text-h6 font-weight-bold"
                                                        :style="selectedCostId === plan.idSuggestedCost ? 'color:#e8c97a;' : 'color:#f5f0e8;'">
                                                        Q{{ plan.cost.toFixed(2) }}
                                                    </span>
                                                    <v-icon
                                                        :icon="selectedCostId === plan.idSuggestedCost ? 'mdi-check-circle' : 'mdi-circle-outline'"
                                                        :color="selectedCostId === plan.idSuggestedCost ? '#e8c97a' : '#3d2f20'"
                                                        size="18" />
                                                </div>
                                                <span class="text-caption" style="color:#c8b8a2;">
                                                    {{ plan.days }} día{{ plan.days !== 1 ? 's' : '' }}
                                                </span>
                                            </div>
                                        </div>

                                        <!-- Resumen plan -->
                                        <div v-if="selectedPlan"
                                            class="plan-summary rounded-lg pa-3 mb-4 d-flex align-center gap-3">
                                            <v-icon icon="mdi-information-outline" color="#e8c97a" size="18" />
                                            <span class="text-caption" style="color:#c8b8a2;">
                                                Activo por <strong style="color:#e8c97a;">{{ selectedPlan.days }} día{{
                                                    selectedPlan.days !== 1 ? 's' : '' }}</strong>
                                                · Expira el <strong style="color:#f5f0e8;">{{ formattedExpiration
                                                    }}</strong>
                                                · Total: <strong style="color:#e8c97a;">Q{{ selectedPlan.cost.toFixed(2)
                                                    }}</strong>
                                            </span>
                                        </div>

                                        <v-btn type="submit" block rounded="lg" size="large" :loading="creating"
                                            :disabled="!selectedPlan" prepend-icon="mdi-bullhorn-variant-outline"
                                            class="btn-primary">
                                            Publicar anuncio
                                        </v-btn>

                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

            </v-window>
        </v-container>

        <!-- Diálogo confirmar deshabilitar -->
        <v-dialog v-model="confirmDialog" max-width="420" persistent>
            <v-card rounded="xl" class="dialog-card">
                <v-card-text class="pa-6 text-center">
                    <v-icon icon="mdi-eye-off-outline" color="#b5451b" size="52" class="mb-3" />
                    <p class="text-h6 font-weight-bold mb-2" style="color:#f5f0e8;">¿Deshabilitar anuncio?</p>
                    <p class="text-body-2 mb-1" style="color:#c8b8a2;">
                        El anuncio <strong style="color:#e8c97a;">#{{ selectedAd?.idAdvertisement }}</strong>
                        dejará de mostrarse en las revistas.
                    </p>
                    <p class="text-caption mt-2" style="color:#c8b8a2;">Esta acción no se puede deshacer.</p>
                </v-card-text>
                <v-divider style="border-color:#3d2f20;" />
                <v-card-actions class="pa-4 gap-2">
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" @click="closeConfirm">Cancelar</v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-eye-off-outline" class="btn-primary"
                        @click="confirmDisable">
                        Sí, deshabilitar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </v-app>
</template>

<style scoped>
/* ── Base ─────────────────────────────────────────────────── */
.tabs-bar {
    background-color: #2c1f0f;
    border-radius: 12px;
}

.ad-card {
    background-color: #2c1f0f !important;
}

.dialog-card {
    background-color: #2c1f0f !important;
}

.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}

.cursor-pointer {
    cursor: pointer;
}

/* ── Filtro estado ──────────────────────────────────────────── */
.status-toggle {
    border: 1px solid #3d2f20;
    background: #1a1008;
}

.status-btn {
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 600;
    color: #c8b8a2;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
}

.status-btn.active {
    background: #e8c97a;
    color: #1a1008;
}

.status-btn:hover:not(.active) {
    background: #3d2f20;
}

/* ── Card elementos ─────────────────────────────────────────── */
.type-badge {
    font-size: 11px;
    font-weight: 700;
}

.dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
}

/* ── Contenido inline ───────────────────────────────────────── */
.content-box {
    border-radius: 8px;
    overflow: hidden;
    background: #1a1008;
    border: 1px solid #3d2f20;
}

.text-box {
    padding: 12px;
    min-height: 64px;
}

.image-box {
    padding: 8px;
}

.video-box {
    overflow: hidden;
}

.inline-img {
    width: 100%;
    max-height: 180px;
    object-fit: cover;
    border-radius: 6px;
    display: block;
}

.inline-video {
    width: 100%;
    max-height: 180px;
    border-radius: 0;
    display: block;
    background: #000;
}

.img-placeholder {
    width: 100%;
    height: 100px;
    background: #2c1f0f;
    border-radius: 6px;
}

/* YouTube thumbnail */
.yt-thumb-wrap {
    position: relative;
    display: block;
    width: 100%;
}

.yt-play-btn {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.28);
    border-radius: 0;
    transition: background 0.2s;
}

.yt-play-btn:hover {
    background: rgba(0, 0, 0, 0.48);
}

.link-anchor {
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    display: block;
}

.link-anchor:hover {
    text-decoration: underline;
}

/* ── Selector de tipo ───────────────────────────────────────── */
.type-selector {
    transition: all 0.2s;
    min-width: 130px;
}

.type-selector:hover {
    filter: brightness(1.1);
}

/* ── Planes ─────────────────────────────────────────────────── */
.plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
}

.plan-card {
    transition: all 0.2s;
}

.plan-card:hover {
    filter: brightness(1.08);
}

.plan-summary {
    background: rgba(232, 201, 122, 0.06);
    border: 1px solid #3d2f20;
}
</style>