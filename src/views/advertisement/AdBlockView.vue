<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { advertisementService } from '@/services/advertisement/advertisement.service'
import type { AdFindResponse } from '@/types/advertisement/AdFindResponse'
import type { AdBlockCreateRequest } from '@/types/advertisement/AdBlockCreateRequest'

const props = defineProps<{ idMagazine: number | string }>()
const magazineId = computed(() => Number(props.idMagazine))

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

// ── Constantes ────────────────────────────────────────────────────────────────
const AD_ICONS: Record<number, string> = { 1: 'mdi-text', 2: 'mdi-image-text', 3: 'mdi-play-circle-outline' }
const AD_LABELS: Record<number, string> = { 1: 'Solo texto', 2: 'Imagen + Texto', 3: 'Video' }
const AD_COLORS: Record<number, string> = { 1: '#e8c97a', 2: '#4caf50', 3: '#b5451b' }

// ── Estado ────────────────────────────────────────────────────────────────────
const ads = ref<AdFindResponse[]>([])
const blockCost = ref<number>(0)
const loading = ref(false)
const tab = ref<'text' | 'image' | 'video'>('text')

const textAds = computed(() => ads.value.filter(a => a.idAdType === 1))
const imageAds = computed(() => ads.value.filter(a => a.idAdType === 2))
const videoAds = computed(() => ads.value.filter(a => a.idAdType === 3))

// ── Diálogo ───────────────────────────────────────────────────────────────────
const blockDialog = ref(false)
const blockForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const blocking = ref(false)
const selectedAd = ref<AdFindResponse | null>(null)
const blockDays = ref<number>(1)
const totalCost = computed(() => blockCost.value * blockDays.value)

const blockModel = reactive<AdBlockCreateRequest>({
    idMagazine: 0, inAdvertisement: 0, cost: 0, expirationDate: new Date(),
})

const required = (v: unknown) => (v !== null && v !== undefined && v !== '') || 'Campo obligatorio'
const minDays = (v: number) => v >= 1 || 'Mínimo 1 día'
const intOnly = (v: number) => Number.isInteger(Number(v)) || 'Solo números enteros'

async function loadData() {
    loading.value = true
    try {
        const [adsData, cost] = await Promise.all([
            advertisementService.findAllByMagazine(magazineId.value),
            advertisementService.getBlockCostByMagazine(magazineId.value),
        ])
        ads.value = adsData
        blockCost.value = cost
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

function openBlockDialog(ad: AdFindResponse) {
    selectedAd.value = ad
    blockDays.value = 1
    blockModel.inAdvertisement = ad.idAdvertisement
    blockModel.idMagazine = magazineId.value
    blockDialog.value = true
}
function closeBlockDialog() {
    blockDialog.value = false
    selectedAd.value = null
    blockDays.value = 1
}
function computeExpiration(): Date {
    const d = new Date()
    d.setDate(d.getDate() + Number(blockDays.value))
    return d
}
async function handleBlock() {
    const { valid } = await blockForm.value!.validate()
    if (!valid) return
    blocking.value = true
    blockModel.cost = totalCost.value
    blockModel.expirationDate = computeExpiration()
    try {
        await advertisementService.blockAd({ ...blockModel })
        notify('Anuncio bloqueado correctamente', 'success')
        closeBlockDialog()
        await loadData()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        blocking.value = false
    }
}

// ── Helpers de contenido ──────────────────────────────────────────────────────
function isImage(link: string) { return /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(link) }
function isYouTube(link: string) { return link.includes('youtube.com') || link.includes('youtu.be') }
function isVideo(link: string) { return /\.(mp4|webm|ogg)(\?.*)?$/i.test(link) }
function youtubeThumb(link: string) {
    const m = link.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : ''
}
function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
}
function isExpired(date: Date | string) { return new Date(date) < new Date() }

onMounted(loadData)
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
                        <v-icon icon="mdi-bullhorn-outline" color="#e8c97a" class="mr-2" />
                        Anuncios de la revista
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">Bloquea anuncios no deseados para los lectores</p>
                </div>
                <v-chip size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                    <v-icon icon="mdi-newspaper-variant" size="14" class="mr-1" />
                    {{ ads.length }} anuncios en total
                </v-chip>
            </div>

            <!-- Banner de costo -->
            <v-card rounded="xl" class="cost-banner pa-4 mb-5" elevation="0">
                <div class="d-flex align-center gap-4 flex-wrap">
                    <div>
                        <p class="text-caption mb-0" style="color:#c8b8a2;">COSTO BASE POR BLOQUEO:</p>
                        <p class="text-h4 font-weight-bold mb-0" style="color:#e8c97a;">
                            Q{{ blockCost.toFixed(2) }}
                            <span class="text-body-2 font-weight-regular" style="color:#c8b8a2;">/ día</span>
                        </p>
                    </div>
                    <v-divider vertical style="border-color:#3d2f20;" class="d-none d-sm-block" />
                    <div>
                        <p class="text-caption mb-1" style="color:#c8b8a2;">
                            El costo total se calcula por los días que selecciones (Tome en
                            cuenta que el
                            precio base es distinto en cada revista)
                        </p>
                        <p class="text-caption mb-0" style="color:#c8b8a2;">
                            Ejemplo: 7 días →
                            <strong style="color:#e8c97a;">Q{{ (blockCost * 7).toFixed(2) }}</strong>
                        </p>
                    </div>
                </div>
            </v-card>

            <!-- Tabs -->
            <v-tabs v-model="tab" class="mb-5 tabs-bar" color="#e8c97a">
                <v-tab value="text" :prepend-icon="AD_ICONS[1]">
                    Solo texto
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#3d2f20; color:#e8c97a;">{{
                        textAds.length }}</v-chip>
                </v-tab>
                <v-tab value="image" :prepend-icon="AD_ICONS[2]">
                    Imagen + Texto
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#3d2f20; color:#e8c97a;">{{
                        imageAds.length }}</v-chip>
                </v-tab>
                <v-tab value="video" :prepend-icon="AD_ICONS[3]">
                    Video
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#3d2f20; color:#e8c97a;">{{
                        videoAds.length }}</v-chip>
                </v-tab>
            </v-tabs>

            <div v-if="loading" class="text-center py-12">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
            </div>

            <v-window v-else v-model="tab">

                <!-- ══ Solo texto ══ -->
                <v-window-item value="text">
                    <div v-if="textAds.length === 0" class="text-center py-12">
                        <v-icon icon="mdi-text-box-remove-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p class="text-body-2" style="color:#c8b8a2;">No hay anuncios de texto.</p>
                    </div>
                    <v-row v-else>
                        <v-col v-for="ad in textAds" :key="ad.idAdvertisement" cols="12" sm="6" md="4">
                            <v-card rounded="xl" class="ad-card h-100 d-flex flex-column" elevation="0">
                                <div class="px-4 pt-4 pb-3 d-flex align-center gap-2">
                                    <div class="type-badge d-flex align-center gap-1 px-2 py-1 rounded-lg"
                                        :style="`background:${AD_COLORS[1]}18; color:${AD_COLORS[1]};`">
                                        <v-icon :icon="AD_ICONS[1]" size="14" />
                                        <span class="text-caption font-weight-bold">{{ AD_LABELS[1] }}</span>
                                    </div>
                                    <v-spacer />
                                    <div class="d-flex align-center gap-1">
                                        <span class="dot" style="background:#4caf50;" />
                                        <span class="text-caption" style="color:#4caf50;">Activo</span>
                                    </div>
                                </div>
                                <v-divider style="border-color:#3d2f20;" />
                                <v-card-text class="px-4 pt-3 pb-2 flex-grow-1">
                                    <div class="mb-3">
                                        <span class="text-caption font-weight-bold d-block mb-1" style="color:#c8b8a2;">
                                            <v-icon icon="mdi-identifier" size="13" class="mr-1" />#{{
                                                ad.idAdvertisement }}
                                        </span>
                                        <span class="text-caption d-flex align-center gap-1"
                                            :style="isExpired(ad.expirationDate) ? 'color:#b5451b;' : 'color:#c8b8a2;'">
                                            <v-icon icon="mdi-calendar-clock-outline" size="13" />
                                            Expira: <strong>{{ formatDate(ad.expirationDate) }}</strong>
                                            <span v-if="isExpired(ad.expirationDate)"> · Vencido</span>
                                        </span>
                                    </div>
                                    <div class="content-box text-box">
                                        <v-icon icon="mdi-format-quote-open" size="16" color="#e8c97a"
                                            class="mb-2 d-block" />
                                        <p v-for="(txt, i) in ad.links" :key="i" class="text-body-2 mb-0"
                                            style="color:#f5f0e8; line-height:1.6;">{{ txt }}</p>
                                    </div>
                                </v-card-text>
                                <v-card-actions class="px-4 pb-4 pt-1 mt-auto">
                                    <v-spacer />
                                    <v-btn variant="outlined" rounded="lg" size="small" prepend-icon="mdi-block-helper"
                                        style="border-color:#b5451b !important; color:#b5451b !important;"
                                        @click="openBlockDialog(ad)">Bloquear</v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

                <!-- ══ Imagen + Texto ══ -->
                <v-window-item value="image">
                    <div v-if="imageAds.length === 0" class="text-center py-12">
                        <v-icon icon="mdi-image-off-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p class="text-body-2" style="color:#c8b8a2;">No hay anuncios de imagen y texto.</p>
                    </div>
                    <v-row v-else>
                        <v-col v-for="ad in imageAds" :key="ad.idAdvertisement" cols="12" sm="6" md="4">
                            <v-card rounded="xl" class="ad-card h-100 d-flex flex-column" elevation="0">
                                <div class="px-4 pt-4 pb-3 d-flex align-center gap-2">
                                    <div class="type-badge d-flex align-center gap-1 px-2 py-1 rounded-lg"
                                        :style="`background:${AD_COLORS[2]}18; color:${AD_COLORS[2]};`">
                                        <v-icon :icon="AD_ICONS[2]" size="14" />
                                        <span class="text-caption font-weight-bold">{{ AD_LABELS[2] }}</span>
                                    </div>
                                    <v-spacer />
                                    <div class="d-flex align-center gap-1">
                                        <span class="dot" style="background:#4caf50;" />
                                        <span class="text-caption" style="color:#4caf50;">Activo</span>
                                    </div>
                                </div>
                                <v-divider style="border-color:#3d2f20;" />
                                <v-card-text class="px-4 pt-3 pb-2 flex-grow-1">
                                    <div class="mb-3">
                                        <span class="text-caption font-weight-bold d-block mb-1" style="color:#c8b8a2;">
                                            <v-icon icon="mdi-identifier" size="13" class="mr-1" />#{{
                                                ad.idAdvertisement }}
                                        </span>
                                        <span class="text-caption d-flex align-center gap-1"
                                            :style="isExpired(ad.expirationDate) ? 'color:#b5451b;' : 'color:#c8b8a2;'">
                                            <v-icon icon="mdi-calendar-clock-outline" size="13" />
                                            Expira: <strong>{{ formatDate(ad.expirationDate) }}</strong>
                                            <span v-if="isExpired(ad.expirationDate)"> · Vencido</span>
                                        </span>
                                    </div>
                                    <!-- Imagen -->
                                    <div class="content-box image-box">
                                        <img v-if="ad.links[0] && isImage(ad.links[0])" :src="ad.links[0]"
                                            loading="lazy" class="inline-img" alt="Imagen del anuncio" />
                                        <div v-else class="img-placeholder d-flex align-center justify-center">
                                            <v-icon icon="mdi-image-off-outline" color="#c8b8a2" size="28" />
                                        </div>
                                    </div>
                                    <!-- Texto -->
                                    <div v-if="ad.links[1]" class="content-box text-box mt-2">
                                        <v-icon icon="mdi-format-quote-open" size="16" color="#4caf50"
                                            class="mb-2 d-block" />
                                        <p class="text-body-2 mb-0" style="color:#f5f0e8; line-height:1.6;">{{
                                            ad.links[1] }}
                                        </p>
                                    </div>
                                </v-card-text>
                                <v-card-actions class="px-4 pb-4 pt-1 mt-auto">
                                    <v-spacer />
                                    <v-btn variant="outlined" rounded="lg" size="small" prepend-icon="mdi-block-helper"
                                        style="border-color:#b5451b !important; color:#b5451b !important;"
                                        @click="openBlockDialog(ad)">Bloquear</v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

                <!-- ══ Video ══ -->
                <v-window-item value="video">
                    <div v-if="videoAds.length === 0" class="text-center py-12">
                        <v-icon icon="mdi-video-off-outline" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <p class="text-body-2" style="color:#c8b8a2;">No hay anuncios de video.</p>
                    </div>
                    <v-row v-else>
                        <v-col v-for="ad in videoAds" :key="ad.idAdvertisement" cols="12" sm="6" md="4">
                            <v-card rounded="xl" class="ad-card h-100 d-flex flex-column" elevation="0">
                                <div class="px-4 pt-4 pb-3 d-flex align-center gap-2">
                                    <div class="type-badge d-flex align-center gap-1 px-2 py-1 rounded-lg"
                                        :style="`background:${AD_COLORS[3]}18; color:${AD_COLORS[3]};`">
                                        <v-icon :icon="AD_ICONS[3]" size="14" />
                                        <span class="text-caption font-weight-bold">{{ AD_LABELS[3] }}</span>
                                    </div>
                                    <v-spacer />
                                    <div class="d-flex align-center gap-1">
                                        <span class="dot" style="background:#4caf50;" />
                                        <span class="text-caption" style="color:#4caf50;">Activo</span>
                                    </div>
                                </div>
                                <v-divider style="border-color:#3d2f20;" />
                                <v-card-text class="px-4 pt-3 pb-2 flex-grow-1">
                                    <div class="mb-3">
                                        <span class="text-caption font-weight-bold d-block mb-1" style="color:#c8b8a2;">
                                            <v-icon icon="mdi-identifier" size="13" class="mr-1" />#{{
                                                ad.idAdvertisement }}
                                        </span>
                                        <span class="text-caption d-flex align-center gap-1"
                                            :style="isExpired(ad.expirationDate) ? 'color:#b5451b;' : 'color:#c8b8a2;'">
                                            <v-icon icon="mdi-calendar-clock-outline" size="13" />
                                            Expira: <strong>{{ formatDate(ad.expirationDate) }}</strong>
                                            <span v-if="isExpired(ad.expirationDate)"> · Vencido</span>
                                        </span>
                                    </div>
                                    <div class="content-box video-box">
                                        <template v-if="ad.links[0] && isYouTube(ad.links[0])">
                                            <div class="yt-thumb-wrap">
                                                <img :src="youtubeThumb(ad.links[0])" loading="lazy" class="inline-img"
                                                    alt="Miniatura video" />
                                                <a :href="ad.links[0]" target="_blank" rel="noopener"
                                                    class="yt-play-btn">
                                                    <v-icon icon="mdi-play-circle" color="white" size="44" />
                                                </a>
                                            </div>
                                        </template>
                                        <template v-else-if="ad.links[0] && isVideo(ad.links[0])">
                                            <video :src="ad.links[0]" controls preload="metadata"
                                                class="inline-video" />
                                        </template>
                                        <template v-else-if="ad.links[0]">
                                            <div class="d-flex align-center gap-2 pa-3">
                                                <v-icon icon="mdi-play-circle-outline" color="#b5451b" size="24" />
                                                <a :href="ad.links[0]" target="_blank" rel="noopener"
                                                    class="text-caption link-anchor" style="color:#b5451b;">{{
                                                        ad.links[0] }}</a>
                                            </div>
                                        </template>
                                    </div>
                                </v-card-text>
                                <v-card-actions class="px-4 pb-4 pt-1 mt-auto">
                                    <v-spacer />
                                    <v-btn variant="outlined" rounded="lg" size="small" prepend-icon="mdi-block-helper"
                                        style="border-color:#b5451b !important; color:#b5451b !important;"
                                        @click="openBlockDialog(ad)">Bloquear</v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

            </v-window>
        </v-container>

        <!-- ══ Diálogo: bloquear ══ -->
        <v-dialog v-model="blockDialog" max-width="460" persistent>
            <v-card rounded="xl" class="dialog-card">
                <v-card-title class="d-flex align-center pa-5 pb-3" style="color:#f5f0e8;">
                    <v-icon icon="mdi-block-helper" color="#b5451b" class="mr-2" />
                    Bloquear anuncio
                    <v-spacer />
                    <v-btn icon="mdi-close" variant="text" :disabled="blocking" @click="closeBlockDialog" />
                </v-card-title>
                <v-divider style="border-color:#3d2f20;" />
                <v-card-text class="pa-5">
                    <v-chip size="small" variant="flat" class="mb-4" style="background:#3d2f20; color:#e8c97a;">
                        <v-icon icon="mdi-identifier" size="14" class="mr-1" />
                        Anuncio #{{ selectedAd?.idAdvertisement }}
                    </v-chip>
                    <v-card rounded="lg" class="cost-preview pa-4 mb-4" elevation="0">
                        <v-row dense align="center">
                            <v-col cols="6" class="text-center">
                                <p class="text-caption mb-1" style="color:#c8b8a2;">Costo por día</p>
                                <p class="text-h6 font-weight-bold mb-0" style="color:#e8c97a;">Q{{ blockCost.toFixed(2)
                                    }}</p>
                            </v-col>
                            <v-divider vertical style="border-color:#3d2f20;" />
                            <v-col cols="6" class="text-center">
                                <p class="text-caption mb-1" style="color:#c8b8a2;">Total a pagar</p>
                                <p class="text-h5 font-weight-bold mb-0" style="color:#4caf50;">Q{{ totalCost.toFixed(2)
                                    }}</p>
                            </v-col>
                        </v-row>
                    </v-card>
                    <v-form ref="blockForm" @submit.prevent="handleBlock">
                        <p class="text-caption mb-2" style="color:#c8b8a2;">
                            <v-icon icon="mdi-calendar-range" size="14" class="mr-1" />Días de bloqueo
                        </p>
                        <div class="d-flex gap-2 mb-3 flex-wrap">
                            <v-btn v-for="d in [1, 3, 7, 15, 30]" :key="d" size="small" rounded="lg" variant="tonal"
                                :style="blockDays === d ? 'background:#b5451b !important; color:#f5f0e8 !important;' : 'color:#c8b8a2;'"
                                @click="blockDays = d">{{ d }}d</v-btn>
                        </div>
                        <v-text-field v-model.number="blockDays" label="O ingresa los días manualmente"
                            prepend-inner-icon="mdi-calendar-clock" variant="outlined" rounded="lg" base-color="#c8b8a2"
                            color="#e8c97a" bg-color="#1a1008" type="number" min="1"
                            :rules="[required, minDays, intOnly]" hide-details="auto" />
                    </v-form>
                    <div class="mt-3 d-flex align-center gap-2">
                        <v-icon icon="mdi-calendar-check-outline" size="16" color="#c8b8a2" />
                        <span class="text-caption" style="color:#c8b8a2;">
                            Expira el <strong style="color:#f5f0e8;">{{ formatDate(computeExpiration()) }}</strong>
                        </span>
                    </div>
                </v-card-text>
                <v-divider style="border-color:#3d2f20;" />
                <v-card-actions class="pa-4 gap-2">
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" :disabled="blocking"
                        @click="closeBlockDialog">Cancelar</v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-block-helper" class="btn-primary"
                        :loading="blocking" @click="handleBlock">
                        Bloquear por Q{{ totalCost.toFixed(2) }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </v-app>
</template>

<style scoped>
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

.cost-banner {
    background-color: #2c1f0f !important;
    border: 1px solid #3d2f20;
}

.cost-preview {
    background-color: #1a1008 !important;
    border: 1px solid #3d2f20;
}

.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}

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
</style>