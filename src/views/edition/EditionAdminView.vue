<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { editionService } from '@/services/edition/edition.service'
import { interactionService } from '@/services/interaction/interaction.service'
import type { EditionFindResponse } from '@/types/edition/EditionFindResponse'
import type { CommentsResponse } from '@/types/interaction/CommentsResponse'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps<{ idMagazine: number | string }>()
const magazineId = computed(() => Number(props.idMagazine))

// ── Datos ─────────────────────────────────────────────────────────────────────
const edition = ref<EditionFindResponse | null>(null)
const comments = ref<CommentsResponse[]>([])
const loading = ref(true)
const error = ref('')

async function loadAll() {
    loading.value = true
    error.value = ''
    try {
        const [editionData, commentsData] = await Promise.all([
            editionService.findAllEditionsByMagazine(magazineId.value),
            interactionService.findAllCommentsByMagazine(magazineId.value),
        ])
        edition.value = editionData
        comments.value = commentsData
    } catch (err) {
        console.error(err)
        error.value = 'No se pudo cargar la información.'
    } finally {
        loading.value = false
    }
}

// ── Visor PDF ─────────────────────────────────────────────────────────────────
const pdfViewer = ref(false)
const currentPdf = ref('')

function openPdf(resources: string) {
    currentPdf.value = resources
    pdfViewer.value = true
}

function embedUrl(link: string): string {
    if (link.includes('drive.google.com')) {
        const match = link.match(/\/d\/([^/]+)/)
        if (match) return `https://drive.google.com/file/d/${match[1]}/preview`
    }
    return `https://docs.google.com/viewer?url=${encodeURIComponent(link)}&embedded=true`
}

function downloadPdf(url: string) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
}

onMounted(loadAll)
</script>

<template>
    <v-app style="background:#1a1008;">

        <!-- Loading -->
        <div v-if="loading" class="d-flex align-center justify-center" style="height:100vh; background:#1a1008;">
            <v-progress-circular indeterminate color="#e8c97a" size="56" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="d-flex align-center justify-center" style="height:100vh; background:#1a1008;">
            <div class="text-center">
                <v-icon icon="mdi-alert-circle-outline" color="#b5451b" size="52" class="mb-3" />
                <p class="text-body-1" style="color:#c8b8a2;">{{ error }}</p>
                <v-btn variant="text" style="color:#e8c97a;" @click="loadAll">Reintentar</v-btn>
            </div>
        </div>

        <v-container v-else class="py-6" style="min-height:100vh;">
            <v-row>

                <!-- ── Columna izquierda: Ediciones ── -->
                <v-col cols="12" md="5">
                    <v-card rounded="xl" class="section-card h-100" elevation="0">

                        <div class="section-header px-5 pt-5 pb-4">
                            <p class="text-h6 font-weight-bold mb-0" style="color:#f5f0e8;">
                                <v-icon icon="mdi-file-document-multiple-outline" color="#e8c97a" size="20"
                                    class="mr-2" />
                                Ediciones
                            </p>
                            <p class="text-caption mt-1" style="color:#c8b8a2;">
                                {{ edition?.links?.length ?? 0 }}
                                archivo{{ (edition?.links?.length ?? 0) !== 1 ? 's' : '' }}
                                disponible{{ (edition?.links?.length ?? 0) !== 1 ? 's' : '' }}
                            </p>
                        </div>

                        <v-divider style="border-color:#3d2f20;" />

                        <v-card-text class="px-4 py-4">

                            <div v-if="!edition || edition.links.length === 0" class="empty-state text-center py-8">
                                <v-icon icon="mdi-file-document-outline" size="44" color="#c8b8a2"
                                    class="mb-3 d-block" />
                                <p class="text-body-2" style="color:#c8b8a2;">No hay ediciones publicadas aún.</p>
                            </div>

                            <div v-else class="editions-list">
                                <!-- Itera sobre EditionNo; usa .resources como URL y .idEdition como clave -->
                                <div v-for="(editionItem, i) in edition.links" :key="editionItem.idEdition"
                                    class="edition-item d-flex align-center gap-3 px-3 py-3 rounded-lg mb-2">

                                    <div
                                        class="edition-num d-flex align-center justify-center rounded-lg flex-shrink-0">
                                        <span class="text-caption font-weight-bold" style="color:#e8c97a;">
                                            {{ i + 1 }}
                                        </span>
                                    </div>

                                    <div class="flex-grow-1 overflow-hidden">
                                        <p class="text-body-2 font-weight-bold mb-0" style="color:#f5f0e8;">
                                            Edición {{ editionItem.idEdition }}
                                        </p>
                                        <p class="text-caption mb-0 text-truncate" style="color:#c8b8a2;">
                                            {{ editionItem.resources }}
                                        </p>
                                    </div>

                                    <div class="d-flex gap-1 flex-shrink-0">
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

                        </v-card-text>
                    </v-card>
                </v-col>

                <!-- ── Columna derecha: Comentarios ── -->
                <v-col cols="12" md="7">
                    <v-card rounded="xl" class="section-card h-100" elevation="0">

                        <div class="section-header px-5 pt-5 pb-4">
                            <p class="text-h6 font-weight-bold mb-0" style="color:#f5f0e8;">
                                <v-icon icon="mdi-comment-multiple-outline" color="#e8c97a" size="20" class="mr-2" />
                                Comentarios
                            </p>
                            <p class="text-caption mt-1" style="color:#c8b8a2;">
                                {{ comments.length }} comentario{{ comments.length !== 1 ? 's' : '' }}
                            </p>
                        </div>

                        <v-divider style="border-color:#3d2f20;" />

                        <v-card-text class="px-4 py-4">

                            <div v-if="comments.length === 0" class="empty-state text-center py-8">
                                <v-icon icon="mdi-comment-off-outline" size="44" color="#c8b8a2" class="mb-3 d-block" />
                                <p class="text-body-2" style="color:#c8b8a2;">
                                    Aún no hay comentarios en esta revista.
                                </p>
                            </div>

                            <div v-else class="comments-list">
                                <div v-for="(c, i) in comments" :key="i" class="comment-bubble mb-3 pa-3 rounded-lg">
                                    <div class="d-flex align-center gap-2 mb-2">
                                        <v-avatar size="28" color="#3d2f20">
                                            <v-icon icon="mdi-account" size="16" color="#e8c97a" />
                                        </v-avatar>
                                        <span class="text-body-2 font-weight-bold" style="color:#e8c97a;">
                                            {{ c.names }}
                                        </span>
                                        <v-spacer />
                                        <span class="text-caption" style="color:#c8b8a2;">#{{ i + 1 }}</span>
                                    </div>
                                    <p class="text-body-2 mb-0 ml-9" style="color:#f5f0e8; line-height:1.6;">
                                        {{ c.comments }}
                                    </p>
                                </div>
                            </div>

                        </v-card-text>
                    </v-card>
                </v-col>

            </v-row>
        </v-container>

        <!-- Visor PDF -->
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
.section-card {
    background-color: #2c1f0f !important;
}

.section-header {
    border-bottom: 1px solid transparent;
}

.editions-list {
    max-height: 60vh;
    overflow-y: auto;
}

.edition-item {
    background: rgba(232, 201, 122, 0.05);
    border: 1px solid #3d2f20;
    transition: border-color 0.2s;
}

.edition-item:hover {
    border-color: #e8c97a;
}

.edition-num {
    width: 28px;
    height: 28px;
    background: rgba(232, 201, 122, 0.12);
    border: 1px solid rgba(232, 201, 122, 0.3);
}

.comments-list {
    max-height: 60vh;
    overflow-y: auto;
}

.comment-bubble {
    background: rgba(232, 201, 122, 0.04);
    border-left: 3px solid #3d2f20;
    transition: border-color 0.2s;
}

.comment-bubble:hover {
    border-color: #e8c97a55;
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