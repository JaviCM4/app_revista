<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { advertisementService } from '@/services/advertisement/advertisement.service'
import { editionService } from '@/services/edition/edition.service'
import { interactionService } from '@/services/interaction/interaction.service'
import type { AdFindResponse } from '@/types/advertisement/AdFindResponse'
import type { EditionFindResponse } from '@/types/edition/EditionFindResponse'
import type { CommentsResponse } from '@/types/interaction/CommentsResponse'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps<{ idMagazine: number | string }>()
const magazineId = computed(() => Number(props.idMagazine))

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

// ── Datos ─────────────────────────────────────────────────────────────────────
const textAds = ref<AdFindResponse[]>([])
const imageAds = ref<AdFindResponse[]>([])
const videoAds = ref<AdFindResponse[]>([])
const edition = ref<EditionFindResponse | null>(null)
const comments = ref<CommentsResponse[]>([])
const hasLiked = ref(false)
const loading = ref(true)

// ── Loop indices ──────────────────────────────────────────────────────────────
const textIdx = ref(0)
const imageIdx = ref(0)
const videoIdx = ref(0)

let textTimer: ReturnType<typeof setInterval> | null = null
let imageTimer: ReturnType<typeof setInterval> | null = null
let videoTimer: ReturnType<typeof setInterval> | null = null

const currentText = computed(() => textAds.value[textIdx.value] ?? null)
const currentImage = computed(() => imageAds.value[imageIdx.value] ?? null)
const currentVideo = computed(() => videoAds.value[videoIdx.value] ?? null)

function startLoops() {
    const MINUTE = 60_000
    if (textAds.value.length > 1) {
        textTimer = setInterval(() => {
            textIdx.value = (textIdx.value + 1) % textAds.value.length
        }, MINUTE)
    }
    if (imageAds.value.length > 1) {
        imageTimer = setInterval(() => {
            imageIdx.value = (imageIdx.value + 1) % imageAds.value.length
        }, MINUTE)
    }
    if (videoAds.value.length > 1) {
        videoTimer = setInterval(() => {
            videoIdx.value = (videoIdx.value + 1) % videoAds.value.length
        }, MINUTE)
    }
}

function stopLoops() {
    if (textTimer) clearInterval(textTimer)
    if (imageTimer) clearInterval(imageTimer)
    if (videoTimer) clearInterval(videoTimer)
}

// ── Comentarios ───────────────────────────────────────────────────────────────
const newComment = ref('')
const sendingComment = ref(false)

async function sendComment() {
    if (!newComment.value.trim()) return
    sendingComment.value = true
    try {
        await interactionService.createComment({ idMagazine: magazineId.value, comment: newComment.value.trim() })
        newComment.value = ''
        comments.value = await interactionService.findAllCommentsByMagazine(magazineId.value)
        notify('Comentario enviado', 'success')
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        sendingComment.value = false
    }
}

// ── Like ──────────────────────────────────────────────────────────────────────
const likingLoading = ref(false)

async function toggleLike() {
    likingLoading.value = true
    try {
        await interactionService.createLike({ idMagazine: magazineId.value })
        hasLiked.value = await interactionService.findLikeByUser(magazineId.value)
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        likingLoading.value = false
    }
}

// ── Visor de PDF ──────────────────────────────────────────────────────────────
const pdfViewer = ref(false)
const currentPdf = ref('')

function openPdf(resources: string) {
    currentPdf.value = resources
    pdfViewer.value = true
}

function downloadPdf(url: string) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function embedUrl(link: string): string {
    if (link.includes('drive.google.com')) {
        const match = link.match(/\/d\/([^/]+)/)
        if (match) return `https://drive.google.com/file/d/${match[1]}/preview`
    }
    return `https://docs.google.com/viewer?url=${encodeURIComponent(link)}&embedded=true`
}

function isYouTube(link: string): boolean {
    return link.includes('youtube.com') || link.includes('youtu.be')
}

function youtubeEmbed(link: string): string {
    const match = link.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}`
    return link
}

function isVideo(link: string): boolean {
    return /\.(mp4|webm|ogg)$/i.test(link) || isYouTube(link)
}

function isImage(link: string): boolean {
    return /\.(jpe?g|png|gif|webp|svg)$/i.test(link)
}

// ── Carga ─────────────────────────────────────────────────────────────────────
async function loadAll() {
    loading.value = true
    try {
        const [ads, editionData, commentsData, liked] = await Promise.all([
            advertisementService.findAllByMagazine(magazineId.value),
            editionService.findAllEditionsByMagazine(magazineId.value),
            interactionService.findAllCommentsByMagazine(magazineId.value),
            interactionService.findLikeByUser(magazineId.value),
        ])
        textAds.value = ads.filter(a => a.idAdType === 1)
        imageAds.value = ads.filter(a => a.idAdType === 2)
        videoAds.value = ads.filter(a => a.idAdType === 3)
        edition.value = editionData
        comments.value = commentsData
        hasLiked.value = liked
        startLoops()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

onMounted(loadAll)
onUnmounted(stopLoops)
</script>

<template>
    <v-app style="background:#1a1008;">

        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top" rounded="pill">
            <v-icon :icon="snackbar.icon" class="mr-2" />{{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <!-- Loading global -->
        <div v-if="loading" class="d-flex align-center justify-center" style="height:100vh; background:#1a1008;">
            <v-progress-circular indeterminate color="#e8c97a" size="56" />
        </div>

        <template v-else>
            <div class="reader-grid">

                <!-- ── ZONA IZQUIERDA ────────────────────────── -->
                <div class="zone-left">

                    <div class="zone-yellow">

                        <!-- Header -->
                        <div class="px-5 pt-5 pb-3 d-flex align-center gap-3">
                            <div class="flex-grow-1">
                                <p class="text-h5 font-weight-bold mb-0" style="color:#f5f0e8;">
                                    <v-icon icon="mdi-book-open-page-variant" color="#e8c97a" class="mr-2" />
                                    Revista
                                </p>
                                <p class="text-caption" style="color:#c8b8a2;">Ediciones disponibles y conversación</p>
                            </div>
                            <v-btn :icon="hasLiked ? 'mdi-heart' : 'mdi-heart-outline'"
                                :color="hasLiked ? '#b5451b' : '#c8b8a2'" variant="text" :loading="likingLoading"
                                size="large" @click="toggleLike" />
                        </div>

                        <v-divider style="border-color:#3d2f20;" />

                        <!-- Ediciones — ahora itera sobre EditionNo, usa .resources como URL -->
                        <div class="px-5 pt-4 pb-2">
                            <p class="text-subtitle-2 font-weight-bold mb-3" style="color:#e8c97a;">
                                <v-icon icon="mdi-file-document-multiple-outline" size="16" class="mr-1" />
                                Ediciones
                            </p>

                            <div v-if="!edition || edition.links.length === 0" class="text-caption py-2"
                                style="color:#c8b8a2;">
                                No hay ediciones publicadas aún.
                            </div>

                            <div v-else class="editions-list">
                                <div v-for="editionItem in edition.links" :key="editionItem.idEdition"
                                    class="edition-item d-flex align-center gap-3 px-3 py-2 rounded-lg mb-2">
                                    <v-icon icon="mdi-file-pdf-box" color="#b5451b" size="22" />
                                    <span class="text-body-2 flex-grow-1 text-truncate" style="color:#f5f0e8;">
                                        Edición {{ editionItem.idEdition }}
                                    </span>
                                    <div class="d-flex gap-1">
                                        <v-btn size="x-small" variant="tonal" rounded="lg"
                                            prepend-icon="mdi-eye-outline" style="color:#e8c97a;"
                                            @click="openPdf(editionItem.resources)">
                                            Ver
                                        </v-btn>
                                        <v-btn size="x-small" variant="tonal" rounded="lg" icon="mdi-download-outline"
                                            style="color:#c8b8a2;" @click="downloadPdf(editionItem.resources)" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <v-divider style="border-color:#3d2f20;" class="mx-5" />

                        <!-- Comentarios -->
                        <div class="px-5 pt-3 pb-4 comments-section">
                            <p class="text-subtitle-2 font-weight-bold mb-3" style="color:#e8c97a;">
                                <v-icon icon="mdi-comment-multiple-outline" size="16" class="mr-1" />
                                Comentarios ({{ comments.length }})
                            </p>

                            <div class="comments-list mb-3">
                                <div v-for="(c, i) in comments" :key="i" class="comment-bubble mb-2 pa-3 rounded-lg">
                                    <div class="d-flex align-center gap-2 mb-1">
                                        <v-avatar size="22" color="#3d2f20">
                                            <v-icon icon="mdi-account" size="14" color="#e8c97a" />
                                        </v-avatar>
                                        <span class="text-caption font-weight-bold" style="color:#e8c97a;">
                                            {{ c.names }}
                                        </span>
                                    </div>
                                    <p class="text-body-2 mb-0 ml-7" style="color:#f5f0e8;">{{ c.comments }}</p>
                                </div>

                                <div v-if="comments.length === 0" class="text-caption py-2 text-center"
                                    style="color:#c8b8a2;">
                                    Sé el primero en comentar.
                                </div>
                            </div>

                            <div class="d-flex gap-2 align-center">
                                <v-text-field v-model="newComment" placeholder="Escribe un comentario..."
                                    variant="outlined" rounded="lg" density="compact" base-color="#c8b8a2"
                                    color="#e8c97a" bg-color="#1a1008" hide-details class="flex-grow-1"
                                    @keyup.enter="sendComment" />
                                <v-btn icon="mdi-send" rounded="lg"
                                    style="background:#b5451b !important; color:#f5f0e8 !important;"
                                    :loading="sendingComment" :disabled="!newComment.trim()" @click="sendComment" />
                            </div>
                        </div>
                    </div>

                    <!-- ZONA ROJA: Anuncios de texto -->
                    <div class="zone-red">
                        <template v-if="currentText">
                            <div class="text-ad-content d-flex align-center gap-4 px-5">
                                <v-icon icon="mdi-bullhorn-outline" color="#1a1008" size="20" class="flex-shrink-0" />
                                <div class="flex-grow-1 overflow-hidden">
                                    <p class="text-body-2 font-weight-bold mb-0 text-truncate" style="color:#1a1008;">
                                        Publicidad
                                    </p>
                                    <div class="d-flex gap-2 flex-wrap mt-1">
                                        <span v-for="(link, i) in currentText.links" :key="i"
                                            class="text-ad-plain text-caption">
                                            {{ link }}
                                        </span>
                                    </div>
                                </div>
                                <div v-if="textAds.length > 1" class="d-flex gap-1 flex-shrink-0">
                                    <div v-for="(_, i) in textAds" :key="i" class="loop-dot"
                                        :class="{ active: i === textIdx }" />
                                </div>
                            </div>
                        </template>
                        <div v-else class="text-ad-content d-flex align-center justify-center">
                            <span class="text-caption" style="color:rgba(26,16,8,0.5);">Sin anuncios de texto</span>
                        </div>
                    </div>
                </div>

                <!-- ── ZONA DERECHA ───────────────────────────── -->
                <div class="zone-right">

                    <!-- ZONA VERDE: Video -->
                    <div class="zone-green">
                        <template v-if="currentVideo">
                            <div class="ad-label">
                                <v-icon icon="mdi-play-circle-outline" size="12" class="mr-1" />
                                Publicidad · Video
                                <span v-if="videoAds.length > 1" class="ml-2">
                                    {{ videoIdx + 1 }}/{{ videoAds.length }}
                                </span>
                            </div>
                            <div class="video-container">
                                <template v-if="isYouTube(currentVideo.links[0] ?? '')">
                                    <iframe :src="youtubeEmbed(currentVideo.links[0] ?? '')" frameborder="0"
                                        allow="autoplay; encrypted-media" allowfullscreen class="video-frame" />
                                </template>
                                <template v-else-if="isVideo(currentVideo.links[0] ?? '')">
                                    <video :key="currentVideo.idAdvertisement" autoplay muted loop class="video-frame">
                                        <source :src="currentVideo.links[0]" />
                                    </video>
                                </template>
                                <template v-else>
                                    <div class="d-flex flex-column align-center justify-center h-100 pa-3">
                                        <v-icon icon="mdi-play-circle-outline" color="#1a1008" size="36" class="mb-2" />
                                        <a :href="currentVideo.links[0]" target="_blank"
                                            class="text-caption text-center"
                                            style="color:#1a1008; word-break:break-all;">
                                            {{ currentVideo.links[0] }}
                                        </a>
                                    </div>
                                </template>
                            </div>
                        </template>
                        <div v-else class="d-flex align-center justify-center h-100">
                            <span class="text-caption" style="color:rgba(26,16,8,0.5);">Sin anuncios de video</span>
                        </div>
                    </div>

                    <!-- ZONA AZUL: Imagen -->
                    <div class="zone-blue">
                        <template v-if="currentImage">
                            <div class="ad-label ad-label-blue">
                                <v-icon icon="mdi-image-text" size="12" class="mr-1" />
                                Publicidad · Imagen
                                <span v-if="imageAds.length > 1" class="ml-2">
                                    {{ imageIdx + 1 }}/{{ imageAds.length }}
                                </span>
                            </div>
                            <div class="image-ad-content">
                                <template v-for="(link, li) in currentImage.links" :key="li">
                                    <template v-if="isImage(link)">
                                        <img :src="link" class="image-ad-img" alt="Anuncio" />
                                    </template>
                                    <template v-else>
                                        <a :href="link" target="_blank" class="image-ad-link text-caption">
                                            <v-icon icon="mdi-open-in-new" size="12" class="mr-1" />
                                            {{ link }}
                                        </a>
                                    </template>
                                </template>
                            </div>
                        </template>
                        <div v-else class="d-flex align-center justify-center h-100">
                            <span class="text-caption" style="color:rgba(26,16,8,0.5);">Sin anuncios de imagen</span>
                        </div>
                    </div>

                </div>
            </div>
        </template>

        <!-- ══ Visor de PDF ══ -->
        <v-dialog v-model="pdfViewer" max-width="900" max-height="90vh" scrollable>
            <v-card rounded="xl" style="background:#2c1f0f;" elevation="0">
                <v-card-title class="d-flex align-center pa-4 pb-3" style="color:#f5f0e8;">
                    <v-icon icon="mdi-file-pdf-box" color="#b5451b" class="mr-2" />
                    Visor de edición
                    <v-spacer />
                    <v-btn icon="mdi-download-outline" variant="text" color="#c8b8a2"
                        @click="downloadPdf(currentPdf)" />
                    <v-btn icon="mdi-close" variant="text" @click="pdfViewer = false" />
                </v-card-title>
                <v-divider style="border-color:#3d2f20;" />
                <v-card-text class="pa-0" style="height:75vh;">
                    <iframe :src="embedUrl(currentPdf)" class="pdf-frame" frameborder="0" />
                </v-card-text>
            </v-card>
        </v-dialog>

    </v-app>
</template>

<style scoped>
.reader-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    grid-template-rows: 100vh;
    width: 100%;
    height: 100vh;
    overflow: hidden;
}

.zone-left {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    border-right: 1px solid #3d2f20;
}

.zone-yellow {
    flex: 1;
    background: #2c1f0f;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.editions-list {
    max-height: 200px;
    overflow-y: auto;
}

.edition-item {
    background: rgba(232, 201, 122, 0.06);
    border: 1px solid #3d2f20;
    transition: border-color 0.2s;
}

.edition-item:hover {
    border-color: #e8c97a;
}

.comments-section {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.comments-list {
    flex: 1;
    overflow-y: auto;
    max-height: 260px;
}

.comment-bubble {
    background: rgba(232, 201, 122, 0.05);
    border-left: 2px solid #3d2f20;
}

.zone-red {
    height: 72px;
    background: #c0392b;
    border-top: 2px solid #922b21;
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

.text-ad-content {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
}

.text-ad-plain {
    color: #1a1008;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
}

.loop-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(26, 16, 8, 0.3);
    transition: background 0.3s;
}

.loop-dot.active {
    background: #1a1008;
}

.zone-right {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

.zone-green {
    height: 35%;
    background: #1e8449;
    border-bottom: 2px solid #145a32;
    position: relative;
    flex-shrink: 0;
    overflow: hidden;
}

.zone-blue {
    flex: 1;
    background: #1a6fa8;
    border-top: 1px solid #117a8b;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.ad-label {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(26, 16, 8, 0.6);
    color: #e8c97a;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    z-index: 2;
    display: flex;
    align-items: center;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.ad-label-blue {
    color: #f5f0e8;
}

.video-container {
    width: 100%;
    height: 100%;
}

.video-frame {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-ad-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 16px 16px;
    overflow: hidden;
}

.image-ad-img {
    max-width: 100%;
    max-height: 70%;
    object-fit: contain;
    border-radius: 8px;
}

.image-ad-link {
    color: #f5f0e8;
    word-break: break-all;
    text-align: center;
    text-decoration: underline;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    width: 100%;
}

.pdf-frame {
    width: 100%;
    height: 100%;
    border: none;
}

::-webkit-scrollbar {
    width: 4px;
}

::-webkit-scrollbar-track {
    background: #1a1008;
}

::-webkit-scrollbar-thumb {
    background: #3d2f20;
    border-radius: 2px;
}
</style>