<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { editionService } from '@/services/edition/edition.service'
import type { EditionFindResponse } from '@/types/edition/EditionFindResponse'
import type { EditionNo } from '@/types/edition/EditionNo'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps<{ idMagazine: number | string }>()
const magazineId = computed(() => Number(props.idMagazine))

// ── Datos ─────────────────────────────────────────────────────────────────────
const edition = ref<EditionFindResponse | null>(null)
const loading = ref(true)

// ── Snackbar ──────────────────────────────────────────────────────────────────
const snackbar = ref({ show: false, message: '', color: '' })
function notify(message: string, color: 'success' | 'error') {
    snackbar.value = { show: true, message, color }
}
function errorMsg(e: unknown): string {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message
    return 'Ocurrió un error inesperado'
}

// ── Carga ─────────────────────────────────────────────────────────────────────
async function loadEditions() {
    loading.value = true
    try {
        edition.value = await editionService.findAllEditionsByMagazine(magazineId.value)
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

onMounted(loadEditions)

// ── Crear edición ─────────────────────────────────────────────────────────────
const createDialog = ref(false)
const newResources = ref('')
const creating = ref(false)
const resourcesError = ref('')

function openCreateDialog() {
    newResources.value = ''
    resourcesError.value = ''
    createDialog.value = true
}

function validateUrl(url: string): boolean {
    try { new URL(url); return true } catch { return false }
}

async function createEdition() {
    resourcesError.value = ''
    if (!newResources.value.trim()) {
        resourcesError.value = 'El enlace es obligatorio'
        return
    }
    if (!validateUrl(newResources.value.trim())) {
        resourcesError.value = 'Ingresa una URL válida'
        return
    }
    creating.value = true
    try {
        await editionService.createEdition({
            magazineId: magazineId.value,
            resource: newResources.value.trim(),
        })
        notify('Edición creada correctamente', 'success')
        createDialog.value = false
        await loadEditions()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        creating.value = false
    }
}

// ── Eliminar edición ──────────────────────────────────────────────────────────
const deleteDialog = ref(false)
const selectedEdition = ref<EditionNo | null>(null)
const deleting = ref(false)

function openDeleteDialog(item: EditionNo) {
    selectedEdition.value = item
    deleteDialog.value = true
}

async function confirmDelete() {
    if (!selectedEdition.value) return
    deleting.value = true
    try {
        await editionService.deleteEdition(selectedEdition.value.idEdition)
        notify('Edición eliminada', 'success')
        deleteDialog.value = false
        await loadEditions()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        deleting.value = false
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
</script>

<template>
    <v-app style="background:#1a1008;">

        <!-- Snackbar -->
        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
            {{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <!-- ══════════════════════════════════════════════════════
             DIÁLOGO — CREAR EDICIÓN
        ══════════════════════════════════════════════════════ -->
        <v-dialog v-model="createDialog" max-width="480" persistent>
            <v-card rounded="xl" elevation="0" style="background:#2a1e12; border:1px solid #5a3e28;">

                <div class="d-flex justify-center pt-7 pb-2">
                    <div style="
                        width:60px; height:60px; border-radius:50%;
                        background:#3d2f20; border:2px solid #e8c97a;
                        display:flex; align-items:center; justify-content:center;">
                        <v-icon icon="mdi-file-plus-outline" color="#e8c97a" size="28" />
                    </div>
                </div>

                <v-card-title class="text-center pb-1" style="color:#f5f0e8; font-size:1.1rem; font-weight:700;">
                    Nueva edición
                </v-card-title>
                <v-card-subtitle class="text-center pb-3" style="color:#c8b8a2;">
                    Ingresa el enlace del archivo PDF
                </v-card-subtitle>

                <v-card-text class="px-6 pb-2">
                    <v-text-field v-model="newResources" label="URL del PDF" placeholder="https://drive.google.com/..."
                        prepend-inner-icon="mdi-link-variant" variant="outlined" density="compact" class="report-input"
                        :error-messages="resourcesError" @keyup.enter="createEdition" />
                    <p class="text-caption mt-1" style="color:#c8b8a2;">
                        <v-icon icon="mdi-information-outline" size="13" class="mr-1" />
                        Compatible con Google Drive, Dropbox y URLs directas.
                    </p>
                </v-card-text>

                <v-card-actions class="px-6 pb-6 gap-3 d-flex">
                    <v-btn variant="outlined" rounded="lg" class="flex-grow-1"
                        style="border-color:#5a3e28 !important; color:#c8b8a2 !important;" :disabled="creating"
                        @click="createDialog = false">
                        Cancelar
                    </v-btn>
                    <v-btn variant="flat" rounded="lg" class="flex-grow-1 btn-primary" prepend-icon="mdi-plus"
                        :loading="creating" @click="createEdition">
                        Crear
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ══════════════════════════════════════════════════════
             DIÁLOGO — CONFIRMAR ELIMINACIÓN
        ══════════════════════════════════════════════════════ -->
        <v-dialog v-model="deleteDialog" max-width="420" persistent>
            <v-card rounded="xl" elevation="0" style="background:#2a1e12; border:1px solid #5a3e28;">

                <div class="d-flex justify-center pt-7 pb-2">
                    <div style="
                        width:60px; height:60px; border-radius:50%;
                        background:#3d0f0f; border:2px solid #b5451b;
                        display:flex; align-items:center; justify-content:center;">
                        <v-icon icon="mdi-delete-alert-outline" color="#b5451b" size="28" />
                    </div>
                </div>

                <v-card-title class="text-center pb-1" style="color:#f5f0e8; font-size:1.1rem; font-weight:700;">
                    Eliminar edición
                </v-card-title>

                <v-card-text class="text-center pb-2" style="color:#c8b8a2; font-size:0.9rem;">
                    ¿Estás seguro de que deseas eliminar la
                    <span class="font-weight-bold" style="color:#e8c97a;">
                        Edición {{ selectedEdition?.idEdition }}
                    </span>?
                    <br /><br />
                    <div class="url-preview text-caption mx-auto">
                        {{ selectedEdition?.resources }}
                    </div>
                    <br />
                    <span style="color:#b5451b; font-size:0.82rem;">
                        <v-icon icon="mdi-alert-outline" size="13" class="mr-1" />
                        Esta acción no se puede deshacer.
                    </span>
                </v-card-text>

                <v-card-actions class="px-6 pb-6 gap-3 d-flex">
                    <v-btn variant="outlined" rounded="lg" class="flex-grow-1"
                        style="border-color:#5a3e28 !important; color:#c8b8a2 !important;" :disabled="deleting"
                        @click="deleteDialog = false">
                        Cancelar
                    </v-btn>
                    <v-btn variant="flat" rounded="lg" class="flex-grow-1 btn-danger" prepend-icon="mdi-delete-outline"
                        :loading="deleting" @click="confirmDelete">
                        Eliminar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ══════════════════════════════════════════════════════
             VISOR PDF
        ══════════════════════════════════════════════════════ -->
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

        <!-- ══════════════════════════════════════════════════════
             CONTENIDO PRINCIPAL
        ══════════════════════════════════════════════════════ -->
        <v-container class="py-6" style="min-height:100vh;">

            <!-- Encabezado -->
            <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-3">
                <div>
                    <p class="text-h5 font-weight-bold mb-1" style="color:#f5f0e8;">
                        <v-icon icon="mdi-file-document-multiple-outline" color="#e8c97a" class="mr-2" />
                        Gestión de Ediciones
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">
                        Administra los archivos PDF publicados en esta revista
                    </p>
                </div>
                <v-btn variant="flat" rounded="lg" class="btn-primary" prepend-icon="mdi-plus"
                    @click="openCreateDialog">
                    Nueva edición
                </v-btn>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="text-center py-16">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
                <p class="text-body-2 mt-4" style="color:#c8b8a2;">Cargando ediciones...</p>
            </div>

            <!-- Sin ediciones -->
            <div v-else-if="!edition || edition.links.length === 0" class="text-center py-16">
                <v-icon icon="mdi-file-document-outline" size="64" color="#3d2f20" class="mb-4 d-block" />
                <p class="text-body-1 mb-1" style="color:#c8b8a2;">
                    No hay ediciones publicadas aún
                </p>
                <p class="text-caption mb-6" style="color:#5a3e28;">
                    Crea la primera edición usando el botón de arriba
                </p>
                <v-btn variant="outlined" rounded="lg"
                    style="border-color:#e8c97a !important; color:#e8c97a !important;" prepend-icon="mdi-plus"
                    @click="openCreateDialog">
                    Nueva edición
                </v-btn>
            </div>

            <!-- Lista de ediciones -->
            <template v-else>
                <!-- Contador -->
                <div class="d-flex align-center gap-2 mb-4">
                    <v-chip size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                        <v-icon icon="mdi-file-multiple-outline" size="13" class="mr-1" />
                        {{ edition.links.length }}
                        edición{{ edition.links.length !== 1 ? 'es' : '' }}
                    </v-chip>
                </div>

                <v-row>
                    <v-col v-for="(editionItem, i) in edition.links" :key="editionItem.idEdition" cols="12" sm="6"
                        lg="4">

                        <v-card rounded="xl" elevation="0" class="edition-card pa-4">

                            <!-- Número + ícono -->
                            <div class="d-flex align-center gap-3 mb-3">
                                <div class="edition-num">
                                    <v-icon icon="mdi-file-pdf-box" color="#b5451b" size="22" />
                                </div>
                                <div class="flex-grow-1">
                                    <p class="text-body-1 font-weight-bold mb-0" style="color:#f5f0e8;">
                                        Edición {{ editionItem.idEdition }}
                                    </p>
                                    <p class="text-caption" style="color:#5a3e28;">
                                        #{{ i + 1 }} en la lista
                                    </p>
                                </div>
                            </div>

                            <!-- URL preview -->
                            <div class="url-preview text-caption mb-4">
                                {{ editionItem.resources }}
                            </div>

                            <!-- Acciones -->
                            <div class="d-flex gap-2">
                                <v-btn variant="tonal" rounded="lg" size="small" prepend-icon="mdi-eye-outline"
                                    style="color:#e8c97a; flex:1;" @click="openPdf(editionItem.resources)">
                                    Ver PDF
                                </v-btn>
                                <v-btn variant="tonal" rounded="lg" size="small" icon="mdi-download-outline"
                                    style="color:#c8b8a2;" @click="downloadPdf(editionItem.resources)" />
                                <v-btn variant="tonal" rounded="lg" size="small" icon="mdi-delete-outline"
                                    style="color:#b5451b;" @click="openDeleteDialog(editionItem)" />
                            </div>
                        </v-card>
                    </v-col>
                </v-row>
            </template>

        </v-container>
    </v-app>
</template>

<style scoped>
.edition-card {
    background: #2a1e12 !important;
    border: 1px solid #3d2f20;
    transition: border-color .2s;
}

.edition-card:hover {
    border-color: #5a3e28;
}

.edition-num {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(181, 69, 27, 0.12);
    border: 1px solid rgba(181, 69, 27, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.url-preview {
    background: #1a1008;
    border: 1px solid #3d2f20;
    border-radius: 8px;
    padding: 8px 10px;
    color: #c8b8a2;
    word-break: break-all;
    line-height: 1.5;
    max-height: 56px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

.btn-primary {
    background: #e8c97a !important;
    color: #1a1008 !important;
    font-weight: 600;
}

.btn-danger {
    background: #b5451b !important;
    color: #f5f0e8 !important;
    font-weight: 600;
}

.report-input :deep(.v-field__outline) {
    border-color: #5a3e28 !important;
}

.report-input :deep(label) {
    color: #c8b8a2 !important;
}

.report-input :deep(input) {
    color: #f5f0e8 !important;
}

.report-input :deep(.v-icon) {
    color: #c8b8a2 !important;
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