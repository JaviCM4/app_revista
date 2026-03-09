<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { magazineService } from '@/services/magazine/magazine.service'
import type { AdminAndEditorResponse } from '@/types/magazine/AdminAndEditorResponse'
import type { UpdateCostRequest } from '@/types/magazine/UpdateCostRequest'

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
const magazines = ref<AdminAndEditorResponse[]>([])
const loading = ref(false)
const tab = ref<'active' | 'inactive'>('active')

const activeMagazines = computed(() => magazines.value.filter(m => m.activeMagazine))
const inactiveMagazines = computed(() => magazines.value.filter(m => !m.activeMagazine))

// ── Diálogo de costos ─────────────────────────────────────────────────────────
const costDialog = ref(false)
const costForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const savingCost = ref(false)
const selectedMag = ref<AdminAndEditorResponse | null>(null)

const costModel = reactive<UpdateCostRequest>({
    id: 0,
    dailyCost: 0,
    adBlockCost: 0,
})

// ── Validaciones ──────────────────────────────────────────────────────────────
const required = (v: unknown) => (v !== null && v !== undefined && v !== '') || 'Campo obligatorio'
const positiveNum = (v: number) => v >= 0 || 'Debe ser mayor o igual a 0'

// ── Carga ─────────────────────────────────────────────────────────────────────
async function loadMagazines() {
    loading.value = true
    try {
        magazines.value = await magazineService.findAllAdmin()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

// ── Diálogo ───────────────────────────────────────────────────────────────────
function openCostDialog(mag: AdminAndEditorResponse) {
    selectedMag.value = mag
    costModel.id = mag.id
    costModel.dailyCost = mag.dailyCost
    costModel.adBlockCost = mag.adBlockCost
    costDialog.value = true
}

function closeCostDialog() {
    costDialog.value = false
    selectedMag.value = null
}

async function handleSaveCost() {
    const { valid } = await costForm.value!.validate()
    if (!valid) return
    savingCost.value = true
    try {
        await magazineService.updateCostMagazine({ ...costModel })
        const mag = magazines.value.find(m => m.id === costModel.id)
        if (mag) {
            mag.dailyCost = costModel.dailyCost
            mag.adBlockCost = costModel.adBlockCost
            mag.activeMagazine = true
        }
        notify('Precios actualizados correctamente', 'success')
        closeCostDialog()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        savingCost.value = false
    }
}

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(loadMagazines)
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
                        <v-icon icon="mdi-shield-crown-outline" color="#e8c97a" class="mr-2" />
                        Gestión de revistas
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">
                        Administra precios y configuración de todas las revistas
                    </p>
                </div>
                <div class="d-flex gap-2">
                    <v-chip size="small" variant="flat" style="background:#4caf50; color:#fff;">
                        <v-icon icon="mdi-circle" size="10" class="mr-1" />
                        {{ activeMagazines.length }} activas
                    </v-chip>
                    <v-chip size="small" variant="flat" style="background:#3d2f20; color:#c8b8a2;">
                        <v-icon icon="mdi-circle-outline" size="10" class="mr-1" />
                        {{ inactiveMagazines.length }} inactivas
                    </v-chip>
                </div>
            </div>

            <!-- Tabs -->
            <v-tabs v-model="tab" class="mb-5 tabs-bar" color="#e8c97a">
                <v-tab value="active" prepend-icon="mdi-check-circle-outline">
                    Activas
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#4caf50; color:#fff;">
                        {{ activeMagazines.length }}
                    </v-chip>
                </v-tab>
                <v-tab value="inactive" prepend-icon="mdi-minus-circle-outline">
                    Inactivas
                    <v-chip size="x-small" variant="flat" class="ml-2" style="background:#3d2f20; color:#c8b8a2;">
                        {{ inactiveMagazines.length }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <!-- Loading -->
            <div v-if="loading" class="text-center py-12">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
            </div>

            <v-window v-else v-model="tab">

                <!-- ══ TAB: Activas ══ -->
                <v-window-item value="active">
                    <div v-if="activeMagazines.length === 0" class="text-center py-12">
                        <v-icon icon="mdi-newspaper-check" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <span class="text-body-2" style="color:#c8b8a2;">No hay revistas activas.</span>
                    </div>
                    <v-row v-else>
                        <v-col v-for="mag in activeMagazines" :key="mag.id" cols="12" sm="6" lg="4">
                            <!-- Card -->
                            <v-card rounded="xl" class="mag-card h-100" elevation="0">
                                <v-card-title class="d-flex align-center gap-2 pt-4 px-4 pb-1">
                                    <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">{{ mag.titles
                                    }}</span>
                                </v-card-title>
                                <v-card-text class="px-4 pb-2">
                                    <p class="text-body-2 mb-4" style="color:#c8b8a2;">{{ mag.description }}</p>
                                    <v-row dense class="mb-3">
                                        <v-col cols="6">
                                            <div class="price-box rounded-lg pa-3 text-center">
                                                <p class="text-caption mb-1" style="color:#c8b8a2;">Costo diario</p>
                                                <p class="text-h6 font-weight-bold" style="color:#e8c97a;">Q{{
                                                    mag.dailyCost.toFixed(2) }}</p>
                                            </div>
                                        </v-col>
                                        <v-col cols="6">
                                            <div class="price-box rounded-lg pa-3 text-center">
                                                <p class="text-caption mb-1" style="color:#c8b8a2;">Bloque anuncio</p>
                                                <p class="text-h6 font-weight-bold" style="color:#e8c97a;">Q{{
                                                    mag.adBlockCost.toFixed(2) }}</p>
                                            </div>
                                        </v-col>
                                    </v-row>
                                    <div class="d-flex flex-wrap gap-1 mb-2">
                                        <v-chip v-if="mag.allowSubscription" size="x-small" variant="tonal"
                                            color="#4caf50" prepend-icon="mdi-check">Suscripción</v-chip>
                                        <v-chip v-if="mag.allowComments" size="x-small" variant="tonal" color="#4caf50"
                                            prepend-icon="mdi-check">Comentarios</v-chip>
                                        <v-chip v-if="mag.allowReactions" size="x-small" variant="tonal" color="#4caf50"
                                            prepend-icon="mdi-check">Reacciones</v-chip>
                                    </div>
                                    <p class="text-caption" style="color:#c8b8a2;">
                                        <v-icon icon="mdi-calendar-outline" size="13" class="mr-1" />
                                        Creada el {{ formatDate(mag.creationDate) }}
                                    </p>
                                </v-card-text>
                                <v-card-actions class="px-4 pb-4 pt-1">
                                    <v-spacer />
                                    <v-btn variant="flat" rounded="lg" size="small" prepend-icon="mdi-pencil-outline"
                                        class="btn-primary" @click="openCostDialog(mag)">
                                        Cambiar costo
                                    </v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

                <!-- ══ TAB: Inactivas ══ -->
                <v-window-item value="inactive">
                    <div v-if="inactiveMagazines.length === 0" class="text-center py-12">
                        <v-icon icon="mdi-newspaper-remove" size="52" color="#c8b8a2" class="mb-3 d-block" />
                        <span class="text-body-2" style="color:#c8b8a2;">No hay revistas inactivas.</span>
                    </div>
                    <v-row v-else>
                        <v-col v-for="mag in inactiveMagazines" :key="mag.id" cols="12" sm="6" lg="4">
                            <!-- Card -->
                            <v-card rounded="xl" class="mag-card h-100" elevation="0">
                                <v-card-title class="d-flex align-center gap-2 pt-4 px-4 pb-1">
                                    <span class="text-body-1 font-weight-bold" style="color:#f5f0e8;">{{ mag.titles
                                    }}</span>
                                </v-card-title>
                                <v-card-text class="px-4 pb-2">
                                    <p class="text-body-2 mb-4" style="color:#c8b8a2;">{{ mag.description }}</p>
                                    <v-row dense class="mb-3">
                                        <v-col cols="6">
                                            <div class="price-box rounded-lg pa-3 text-center">
                                                <p class="text-caption mb-1" style="color:#c8b8a2;">Costo diario</p>
                                                <p class="text-h6 font-weight-bold" style="color:#e8c97a;">Q{{
                                                    mag.dailyCost.toFixed(2) }}</p>
                                            </div>
                                        </v-col>
                                        <v-col cols="6">
                                            <div class="price-box rounded-lg pa-3 text-center">
                                                <p class="text-caption mb-1" style="color:#c8b8a2;">Bloque anuncio</p>
                                                <p class="text-h6 font-weight-bold" style="color:#e8c97a;">Q{{
                                                    mag.adBlockCost.toFixed(2) }}</p>
                                            </div>
                                        </v-col>
                                    </v-row>
                                    <div class="d-flex flex-wrap gap-1 mb-2">
                                        <v-chip v-if="mag.allowSubscription" size="x-small" variant="tonal"
                                            color="#4caf50" prepend-icon="mdi-check">Suscripción</v-chip>
                                        <v-chip v-if="mag.allowComments" size="x-small" variant="tonal" color="#4caf50"
                                            prepend-icon="mdi-check">Comentarios</v-chip>
                                        <v-chip v-if="mag.allowReactions" size="x-small" variant="tonal" color="#4caf50"
                                            prepend-icon="mdi-check">Reacciones</v-chip>
                                    </div>
                                    <p class="text-caption" style="color:#c8b8a2;">
                                        <v-icon icon="mdi-calendar-outline" size="13" class="mr-1" />
                                        Creada el {{ formatDate(mag.creationDate) }}
                                    </p>
                                </v-card-text>
                                <v-card-actions class="px-4 pb-4 pt-1">
                                    <v-spacer />
                                    <v-btn variant="flat" rounded="lg" size="small" prepend-icon="mdi-currency-usd"
                                        class="btn-primary" @click="openCostDialog(mag)">
                                        Asignar costo
                                    </v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

            </v-window>
        </v-container>

        <!-- ══ Diálogo: precios ══ -->
        <v-dialog v-model="costDialog" max-width="460" persistent>
            <v-card rounded="xl" class="dialog-card">

                <v-card-title class="d-flex align-center pa-5 pb-3" style="color:#f5f0e8;">
                    <v-icon icon="mdi-currency-usd" color="#e8c97a" class="mr-2" />
                    {{ selectedMag?.activeMagazine ? 'Cambiar costo' : 'Asignar costo' }}
                    <v-spacer />
                    <v-btn icon="mdi-close" variant="text" :disabled="savingCost" @click="closeCostDialog" />
                </v-card-title>

                <v-divider style="border-color:#3d2f20;" />

                <v-card-text class="pa-5">
                    <v-chip size="small" variant="flat" class="mb-5" style="background:#3d2f20; color:#e8c97a;">
                        <v-icon icon="mdi-newspaper-variant" size="14" class="mr-1" />
                        {{ selectedMag?.titles }}
                    </v-chip>

                    <v-form ref="costForm" @submit.prevent="handleSaveCost">
                        <p class="text-caption mb-1" style="color:#c8b8a2;">
                            <v-icon icon="mdi-calendar-clock" size="14" class="mr-1" />
                            Costo diario — suscripción por día
                        </p>
                        <v-text-field v-model.number="costModel.dailyCost" label="Costo diario (Q) *"
                            prepend-inner-icon="mdi-currency-usd" variant="outlined" rounded="lg" base-color="#c8b8a2"
                            color="#e8c97a" bg-color="#1a1008" type="number" step="0.01" min="0"
                            :rules="[required, positiveNum]" hide-details="auto" class="mb-4" />

                        <p class="text-caption mb-1" style="color:#c8b8a2;">
                            <v-icon icon="mdi-bullhorn-outline" size="14" class="mr-1" />
                            Costo por bloque de anuncio
                        </p>
                        <v-text-field v-model.number="costModel.adBlockCost" label="Costo por bloque (Q) *"
                            prepend-inner-icon="mdi-currency-usd" variant="outlined" rounded="lg" base-color="#c8b8a2"
                            color="#e8c97a" bg-color="#1a1008" type="number" step="0.01" min="0"
                            :rules="[required, positiveNum]" hide-details="auto" />
                    </v-form>
                </v-card-text>

                <v-divider style="border-color:#3d2f20;" />

                <v-card-actions class="pa-4 gap-2">
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" :disabled="savingCost"
                        @click="closeCostDialog">
                        Cancelar
                    </v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-content-save-outline" class="btn-primary"
                        :loading="savingCost" @click="handleSaveCost">
                        Guardar
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

.mag-card {
    background-color: #2c1f0f !important;
}

.dialog-card {
    background-color: #2c1f0f !important;
}

.price-box {
    background: #1a1008;
    border: 1px solid #3d2f20;
}

.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}
</style>