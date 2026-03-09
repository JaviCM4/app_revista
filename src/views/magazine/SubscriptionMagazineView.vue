<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { magazineService } from '@/services/magazine/magazine.service'
import { subscriptionService } from '@/services/magazine/subscription.service'
import type { NormaResponse } from '@/types/magazine/NormaResponse'

const router = useRouter()

function goToEdition(idMagazine: number) {
    router.push({ name: 'edition', params: { idMagazine } })
}

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

// ── Estado ────────────────────────────────────────────────────────────────────
const magazines = ref<NormaResponse[]>([])
const loading = ref(false)
const cancelling = ref<number | null>(null)

// ── Diálogo de confirmación ───────────────────────────────────────────────────
const confirmDialog = ref(false)
const selectedMag = ref<NormaResponse | null>(null)

function openConfirm(mag: NormaResponse) {
    selectedMag.value = mag
    confirmDialog.value = true
}

function closeConfirm() {
    confirmDialog.value = false
    selectedMag.value = null
}

// ── Carga ─────────────────────────────────────────────────────────────────────
async function loadSubscriptions() {
    loading.value = true
    try {
        magazines.value = await magazineService.findAllSubscriber()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

// ── Cancelar suscripción ──────────────────────────────────────────────────────
async function confirmCancel() {
    if (!selectedMag.value) return
    const mag = selectedMag.value
    cancelling.value = mag.id
    closeConfirm()
    try {
        await subscriptionService.deleteSubscription(mag.id)
        magazines.value = magazines.value.filter(m => m.id !== mag.id)
        notify(`Suscripción a "${mag.titles}" cancelada`, 'success')
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        cancelling.value = null
    }
}

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(loadSubscriptions)
</script>

<template>
    <v-app style="background: #1a1008;">

        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top" rounded="pill">
            <v-icon :icon="snackbar.icon" class="mr-2" />{{ snackbar.message }}
            <template #actions>
                <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
            </template>
        </v-snackbar>

        <v-container class="py-6" style="background: #1a1008;">

            <!-- Encabezado -->
            <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-3">
                <div>
                    <p class="text-h5 font-weight-bold mb-1" style="color:#f5f0e8;">
                        <v-icon icon="mdi-bookmark-multiple-outline" color="#e8c97a" class="mr-2" />
                        Mis suscripciones
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">
                        Revistas a las que estás suscrito actualmente
                    </p>
                </div>
                <v-chip v-if="!loading" size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                    <v-icon icon="mdi-newspaper-variant-multiple" size="14" class="mr-1" />
                    {{ magazines.length }} {{ magazines.length === 1 ? 'revista' : 'revistas' }}
                </v-chip>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="text-center py-12">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
            </div>

            <!-- Sin suscripciones -->
            <div v-else-if="magazines.length === 0" class="text-center py-12">
                <v-icon icon="mdi-bookmark-off-outline" size="56" color="#c8b8a2" class="mb-3 d-block" />
                <p class="text-body-1 font-weight-bold mb-1" style="color:#f5f0e8;">Sin suscripciones</p>
                <p class="text-body-2" style="color:#c8b8a2;">Aún no te has suscrito a ninguna revista.</p>
                <v-btn variant="flat" rounded="lg" class="btn-primary mt-4" prepend-icon="mdi-bookshelf" to="/catalogo">
                    Ver catálogo
                </v-btn>
            </div>

            <!-- Grid -->
            <v-row v-else>
                <v-col v-for="mag in magazines" :key="mag.id" cols="12" sm="6" md="4">
                    <v-card rounded="xl" class="mag-card h-100" elevation="0">

                        <v-card-title class="pt-4 px-4 pb-1">
                            <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">{{ mag.titles }}</span>
                        </v-card-title>

                        <v-card-text class="px-4">
                            <div class="d-flex align-center gap-3 mb-3">
                                <span class="text-caption" style="color:#c8b8a2;">
                                    <v-icon icon="mdi-account-outline" size="13" class="mr-1" />
                                    {{ mag.author }}
                                </span>
                                <span class="text-caption" style="color:#c8b8a2;">
                                    <v-icon icon="mdi-calendar-outline" size="13" class="mr-1" />
                                    {{ formatDate(mag.creationDate) }}
                                </span>
                            </div>

                            <p class="text-body-2 mb-3" style="color:#c8b8a2;">{{ mag.description }}</p>

                            <div v-if="mag.categories?.length" class="mb-2">
                                <v-icon icon="mdi-bookmark-outline" size="13" color="#e8c97a" class="mr-1" />
                                <v-chip v-for="cat in mag.categories" :key="cat" size="x-small" variant="tonal"
                                    color="#e8c97a" class="mr-1 mb-1">{{ cat }}</v-chip>
                            </div>

                            <div v-if="mag.tags?.length">
                                <v-icon icon="mdi-pound" size="13" color="#c8b8a2" class="mr-1" />
                                <v-chip v-for="tag in mag.tags" :key="tag" size="x-small" variant="outlined"
                                    color="#c8b8a2" class="mr-1 mb-1">{{ tag }}</v-chip>
                            </div>
                        </v-card-text>

                        <v-card-actions class="px-4 pb-4 pt-0 gap-2">
                            <!-- Botón principal: ir a leer -->
                            <v-btn variant="flat" rounded="lg" size="small" prepend-icon="mdi-book-open-page-variant"
                                class="btn-primary" @click="goToEdition(mag.id)">
                                Leer revista
                            </v-btn>
                            <v-spacer />
                            <!-- Cancelar suscripción -->
                            <v-btn variant="outlined" rounded="lg" size="small"
                                prepend-icon="mdi-bookmark-remove-outline"
                                style="border-color:#b5451b !important; color:#b5451b !important;"
                                :loading="cancelling === mag.id" @click="openConfirm(mag)">
                                Cancelar
                            </v-btn>
                        </v-card-actions>

                    </v-card>
                </v-col>
            </v-row>

        </v-container>

        <!-- ══ Diálogo de confirmación ══ -->
        <v-dialog v-model="confirmDialog" max-width="420" persistent>
            <v-card rounded="xl" class="dialog-card">
                <v-card-text class="pa-6 text-center">
                    <v-icon icon="mdi-alert-circle-outline" color="#b5451b" size="52" class="mb-3" />
                    <p class="text-h6 font-weight-bold mb-2" style="color:#f5f0e8;">¿Cancelar suscripción?</p>
                    <p class="text-body-2 mb-1" style="color:#c8b8a2;">Estás por cancelar tu suscripción a</p>
                    <p class="text-body-1 font-weight-bold mb-3" style="color:#e8c97a;">"{{ selectedMag?.titles }}"</p>
                    <p class="text-caption" style="color:#c8b8a2;">Esta acción no se puede deshacer.</p>
                </v-card-text>
                <v-divider style="border-color:#3d2f20;" />
                <v-card-actions class="pa-4 gap-2">
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" @click="closeConfirm">Volver</v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-bookmark-remove-outline" class="btn-danger"
                        @click="confirmCancel">
                        Sí, cancelar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </v-app>
</template>

<style scoped>
.mag-card {
    background-color: #2c1f0f !important;
}

.dialog-card {
    background-color: #2c1f0f !important;
}

.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}

.btn-danger {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}
</style>