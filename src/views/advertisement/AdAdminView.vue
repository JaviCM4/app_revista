<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { advertisementService } from '@/services/advertisement/advertisement.service'
import type { AdFindResponse } from '@/types/advertisement/AdFindResponse'

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = reactive({ show: false, message: '', color: 'success' as string, icon: '' })
const notifyMap = {
    success: { color: 'success', icon: 'mdi-check-circle-outline' },
    error: { color: 'error', icon: 'mdi-alert-circle-outline' },
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
const loading = ref(false)
const tab = ref<'text' | 'image' | 'video'>('text')

const textAds = computed(() => ads.value.filter(a => a.idAdType === 1))
const imageAds = computed(() => ads.value.filter(a => a.idAdType === 2))
const videoAds = computed(() => ads.value.filter(a => a.idAdType === 3))




async function loadData() {
    loading.value = true
    try {
        ads.value = await advertisementService.findAllAdvertisement()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

// ── Deshabilitar ──────────────────────────────────────────────────────────────
const confirmDialog = ref(false)
const selectedAd = ref<AdFindResponse | null>(null)
const disabling = ref(false)

function openConfirm(ad: AdFindResponse) {
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
    disabling.value = true
    closeConfirm()
    try {
        await advertisementService.disableAd(ad.idAdvertisement)
        notify(`Anuncio #${ad.idAdvertisement} deshabilitado`, 'success')
        await loadData()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        disabling.value = false
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
                        Gestión de anuncios
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">
                        Administra y deshabilita anuncios de la plataforma
                    </p>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <v-chip size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                        <v-icon icon="mdi-newspaper-variant" size="13" class="mr-1" />
                        {{ ads.length }} total
                    </v-chip>
                </div>
            </div>

            <!-- Tabs por tipo -->
            <v-tabs v-model="tab" class="mb-5 tabs-bar" color="#e8c97a">
                <v-tab value="text" :prepend-icon="AD_ICONS[1]">
                    Solo texto
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#3d2f20; color:#e8c97a;">
                        {{ textAds.length }}
                    </v-chip>
                </v-tab>
                <v-tab value="image" :prepend-icon="AD_ICONS[2]">
                    Imagen + Texto
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#3d2f20; color:#e8c97a;">
                        {{ imageAds.length }}
                    </v-chip>
                </v-tab>
                <v-tab value="video" :prepend-icon="AD_ICONS[3]">
                    Video
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#3d2f20; color:#e8c97a;">
                        {{ videoAds.length }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <!-- Loading -->
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
                                            <v-icon icon="mdi-identifier" size="13" class="mr-1" />
                                            #{{ ad.idAdvertisement }}
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
                                    <v-btn variant="outlined" rounded="lg" size="small"
                                        prepend-icon="mdi-eye-off-outline"
                                        style="border-color:#b5451b !important; color:#b5451b !important;"
                                        @click="openConfirm(ad)">
                                        Deshabilitar
                                    </v-btn>
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
                                            <v-icon icon="mdi-identifier" size="13" class="mr-1" />
                                            #{{ ad.idAdvertisement }}
                                        </span>
                                        <span class="text-caption d-flex align-center gap-1"
                                            :style="isExpired(ad.expirationDate) ? 'color:#b5451b;' : 'color:#c8b8a2;'">
                                            <v-icon icon="mdi-calendar-clock-outline" size="13" />
                                            Expira: <strong>{{ formatDate(ad.expirationDate) }}</strong>
                                            <span v-if="isExpired(ad.expirationDate)"> · Vencido</span>
                                        </span>
                                    </div>
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
                                </v-card-text>
                                <v-card-actions class="px-4 pb-4 pt-1 mt-auto">
                                    <v-spacer />
                                    <v-btn variant="outlined" rounded="lg" size="small"
                                        prepend-icon="mdi-eye-off-outline"
                                        style="border-color:#b5451b !important; color:#b5451b !important;"
                                        @click="openConfirm(ad)">
                                        Deshabilitar
                                    </v-btn>
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
                                            <v-icon icon="mdi-identifier" size="13" class="mr-1" />
                                            #{{ ad.idAdvertisement }}
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
                                                    class="text-caption link-anchor" style="color:#b5451b;">
                                                    {{ ad.links[0] }}
                                                </a>
                                            </div>
                                        </template>
                                    </div>
                                </v-card-text>
                                <v-card-actions class="px-4 pb-4 pt-1 mt-auto">
                                    <v-spacer />
                                    <v-btn variant="outlined" rounded="lg" size="small"
                                        prepend-icon="mdi-eye-off-outline"
                                        style="border-color:#b5451b !important; color:#b5451b !important;"
                                        @click="openConfirm(ad)">
                                        Deshabilitar
                                    </v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

            </v-window>
        </v-container>

        <!-- Diálogo confirmar deshabilitar -->
        <v-dialog v-model="confirmDialog" max-width="400" persistent>
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
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" :disabled="disabling"
                        @click="closeConfirm">
                        Cancelar
                    </v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-eye-off-outline" class="btn-primary"
                        :loading="disabling" @click="confirmDisable">
                        Sí, deshabilitar
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

.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}

/* ── Card ───────────────────────────────────────────────────── */
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
    display: block;
}

.link-anchor:hover {
    text-decoration: underline;
}
</style>