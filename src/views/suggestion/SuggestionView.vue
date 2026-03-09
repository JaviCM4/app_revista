<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { suggestedCostService } from '@/services/suggested/suggested.service'
import type { SuggestedCostResponse } from '@/types/suggested/SuggestedCostResponse'
import type { SuggestedCostCreateRequest } from '@/types/suggested/SuggestedCostCreateRequest'

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
const costs = ref<SuggestedCostResponse[]>([])
const loading = ref(false)

// Ordenados por días ascendente
const sortedCosts = computed(() =>
    [...costs.value].sort((a, b) => a.days - b.days)
)

async function loadCosts() {
    loading.value = true
    try {
        costs.value = await suggestedCostService.findAll()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        loading.value = false
    }
}

// ── Crear ─────────────────────────────────────────────────────────────────────
const createDialog = ref(false)
const createForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const creating = ref(false)

const newCost = reactive<SuggestedCostCreateRequest>({ cost: 0, days: 1 })

const ruleRequired = (v: unknown) => (v !== null && v !== undefined && v !== '') || 'Campo obligatorio'
const rulePositive = (v: number) => v > 0 || 'Debe ser mayor a 0'
const ruleInteger = (v: number) => Number.isInteger(Number(v)) || 'Solo números enteros'

function openCreate() {
    newCost.cost = 0
    newCost.days = 1
    createDialog.value = true
}
function closeCreate() {
    createDialog.value = false
}

async function handleCreate() {
    const { valid } = await createForm.value!.validate()
    if (!valid) return
    creating.value = true
    try {
        await suggestedCostService.create({ ...newCost })
        notify('Plan creado correctamente', 'success')
        closeCreate()
        await loadCosts()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        creating.value = false
    }
}

// ── Eliminar ──────────────────────────────────────────────────────────────────
const deleteDialog = ref(false)
const selectedCost = ref<SuggestedCostResponse | null>(null)
const deleting = ref(false)

function openDelete(cost: SuggestedCostResponse) {
    selectedCost.value = cost
    deleteDialog.value = true
}
function closeDelete() {
    deleteDialog.value = false
    selectedCost.value = null
}
async function handleDelete() {
    if (!selectedCost.value) return
    deleting.value = true
    try {
        await suggestedCostService.delete(selectedCost.value.idSuggestedCost)
        notify('Plan eliminado', 'success')
        closeDelete()
        await loadCosts()
    } catch (e) {
        notify(errorMsg(e), 'error')
    } finally {
        deleting.value = false
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pricePerDay(cost: SuggestedCostResponse) {
    return cost.days > 0 ? (cost.cost / cost.days).toFixed(2) : '0.00'
}

onMounted(loadCosts)
</script>

<template>
    <v-app style="background:#1a1008;">

        <!-- Snackbar -->
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
                        <v-icon icon="mdi-tag-multiple-outline" color="#e8c97a" class="mr-2" />
                        Planes de precio
                    </p>
                    <p class="text-body-2" style="color:#c8b8a2;">
                        Gestiona los planes disponibles para publicar anuncios
                    </p>
                </div>
                <div class="d-flex align-center gap-3">
                    <v-chip size="small" variant="flat" style="background:#3d2f20; color:#e8c97a;">
                        <v-icon icon="mdi-layers-outline" size="14" class="mr-1" />
                        {{ costs.length }} plan{{ costs.length !== 1 ? 'es' : '' }}
                    </v-chip>
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-plus" class="btn-primary" @click="openCreate">
                        Nuevo plan
                    </v-btn>
                </div>
            </div>

            <!-- ── Loading ── -->
            <div v-if="loading" class="text-center py-16">
                <v-progress-circular indeterminate color="#e8c97a" size="48" />
            </div>

            <!-- ── Empty state ── -->
            <div v-else-if="costs.length === 0" class="text-center py-16">
                <v-icon icon="mdi-tag-off-outline" size="60" color="#c8b8a2" class="mb-4 d-block" />
                <p class="text-body-1 font-weight-bold mb-1" style="color:#f5f0e8;">Sin planes de precio</p>
                <p class="text-body-2 mb-5" style="color:#c8b8a2;">
                    Aún no hay planes configurados. Crea el primero.
                </p>
                <v-btn variant="flat" rounded="lg" prepend-icon="mdi-plus" class="btn-primary" @click="openCreate">
                    Crear primer plan
                </v-btn>
            </div>

            <!-- ── Grid de planes ── -->
            <v-row v-else>
                <v-col v-for="plan in sortedCosts" :key="plan.idSuggestedCost" cols="12" sm="6" md="4" lg="3">

                    <v-card rounded="xl" class="plan-card d-flex flex-column" elevation="0">

                        <!-- Franja dorada superior -->
                        <div class="plan-accent" />

                        <v-card-text class="pa-5 flex-grow-1">

                            <!-- Precio principal -->
                            <div class="text-center mb-4">
                                <p class="price-label mb-0">Q</p>
                                <p class="price-amount mb-0">{{ plan.cost.toFixed(2) }}</p>
                                <p class="text-caption" style="color:#c8b8a2;">
                                    por {{ plan.days }} día{{ plan.days !== 1 ? 's' : '' }}
                                </p>
                            </div>

                            <v-divider style="border-color:#3d2f20;" class="mb-4" />

                            <!-- Métricas -->
                            <div class="d-flex flex-column gap-2">
                                <div class="metric-row d-flex align-center justify-space-between">
                                    <span class="text-caption d-flex align-center gap-1" style="color:#c8b8a2;">
                                        <v-icon icon="mdi-calendar-range" size="13" />
                                        Duración
                                    </span>
                                    <span class="text-caption font-weight-bold" style="color:#f5f0e8;">
                                        {{ plan.days }} día{{ plan.days !== 1 ? 's' : '' }}
                                    </span>
                                </div>
                                <div class="metric-row d-flex align-center justify-space-between">
                                    <span class="text-caption d-flex align-center gap-1" style="color:#c8b8a2;">
                                        <v-icon icon="mdi-currency-usd" size="13" />
                                        Precio/día
                                    </span>
                                    <span class="text-caption font-weight-bold" style="color:#e8c97a;">
                                        Q{{ pricePerDay(plan) }}
                                    </span>
                                </div>
                            </div>

                        </v-card-text>

                        <!-- Acción eliminar -->
                        <v-card-actions class="px-5 pb-4 pt-0">
                            <v-btn block variant="outlined" rounded="lg" size="small"
                                prepend-icon="mdi-trash-can-outline"
                                style="border-color:#b5451b !important; color:#b5451b !important;"
                                @click="openDelete(plan)">
                                Eliminar plan
                            </v-btn>
                        </v-card-actions>

                    </v-card>
                </v-col>
            </v-row>

        </v-container>

        <!-- ══ Diálogo: Crear plan ══ -->
        <v-dialog v-model="createDialog" max-width="440" persistent>
            <v-card rounded="xl" class="dialog-card">

                <v-card-title class="d-flex align-center pa-5 pb-3" style="color:#f5f0e8;">
                    <v-icon icon="mdi-plus-circle-outline" color="#e8c97a" class="mr-2" />
                    Nuevo plan de precio
                    <v-spacer />
                    <v-btn icon="mdi-close" variant="text" :disabled="creating" @click="closeCreate" />
                </v-card-title>

                <v-divider style="border-color:#3d2f20;" />

                <v-card-text class="pa-5">

                    <!-- Preview en vivo -->
                    <v-card rounded="lg" class="preview-card pa-4 mb-5 text-center" elevation="0">
                        <p class="text-caption mb-1" style="color:#c8b8a2;">Vista previa del plan</p>
                        <p class="text-h4 font-weight-bold mb-0" style="color:#e8c97a;">
                            Q{{ (newCost.cost || 0).toFixed(2) }}
                        </p>
                        <p class="text-caption" style="color:#c8b8a2;">
                            {{ newCost.days || 0 }} día{{ (newCost.days || 0) !== 1 ? 's' : '' }}
                            <span v-if="newCost.days > 0 && newCost.cost > 0">
                                · Q{{ (newCost.cost / newCost.days).toFixed(2) }}/día
                            </span>
                        </p>
                    </v-card>

                    <v-form ref="createForm" @submit.prevent="handleCreate">
                        <p class="text-caption font-weight-bold mb-3" style="color:#c8b8a2;">DETALLES DEL PLAN</p>

                        <v-text-field v-model.number="newCost.cost" label="Costo total (Q) *"
                            prepend-inner-icon="mdi-currency-usd" variant="outlined" rounded="lg" base-color="#c8b8a2"
                            color="#e8c97a" bg-color="#1a1008" type="number" min="0" step="0.01"
                            :rules="[ruleRequired, rulePositive]" hide-details="auto" class="mb-4"
                            hint="Precio que pagará el anunciante" persistent-hint />

                        <v-text-field v-model.number="newCost.days" label="Duración (días) *"
                            prepend-inner-icon="mdi-calendar-range" variant="outlined" rounded="lg" base-color="#c8b8a2"
                            color="#e8c97a" bg-color="#1a1008" type="number" min="1"
                            :rules="[ruleRequired, rulePositive, ruleInteger]" hide-details="auto" class="mb-2"
                            hint="Por cuántos días estará activo el anuncio" persistent-hint />

                        <!-- Atajos de días rápidos -->
                        <div class="d-flex gap-2 flex-wrap mt-3 mb-1">
                            <v-btn v-for="d in [1, 3, 7, 15, 30]" :key="d" size="small" rounded="lg" variant="tonal"
                                :style="newCost.days === d
                                    ? 'background:#e8c97a22 !important; color:#e8c97a !important; border:1px solid #e8c97a55;'
                                    : 'color:#c8b8a2;'" @click="newCost.days = d">
                                {{ d }}d
                            </v-btn>
                        </div>
                    </v-form>
                </v-card-text>

                <v-divider style="border-color:#3d2f20;" />

                <v-card-actions class="pa-4 gap-2">
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" :disabled="creating" @click="closeCreate">
                        Cancelar
                    </v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-check" class="btn-primary" :loading="creating"
                        @click="handleCreate">
                        Crear plan
                    </v-btn>
                </v-card-actions>

            </v-card>
        </v-dialog>

        <!-- ══ Diálogo: Eliminar plan ══ -->
        <v-dialog v-model="deleteDialog" max-width="400" persistent>
            <v-card rounded="xl" class="dialog-card">
                <v-card-text class="pa-6 text-center">
                    <v-icon icon="mdi-trash-can-outline" color="#b5451b" size="52" class="mb-3" />
                    <p class="text-h6 font-weight-bold mb-2" style="color:#f5f0e8;">¿Eliminar este plan?</p>
                    <p class="text-body-2 mb-1" style="color:#c8b8a2;">
                        El plan de
                        <strong style="color:#e8c97a;">Q{{ selectedCost?.cost.toFixed(2) }}</strong>
                        por <strong style="color:#e8c97a;">{{ selectedCost?.days }} día{{ (selectedCost?.days ?? 0) !==
                            1 ? 's'
                            : '' }}</strong>
                        será eliminado permanentemente.
                    </p>
                    <p class="text-caption mt-2" style="color:#c8b8a2;">Esta acción no se puede deshacer.</p>
                </v-card-text>
                <v-divider style="border-color:#3d2f20;" />
                <v-card-actions class="pa-4 gap-2">
                    <v-btn variant="text" rounded="lg" style="color:#c8b8a2;" :disabled="deleting" @click="closeDelete">
                        Cancelar
                    </v-btn>
                    <v-spacer />
                    <v-btn variant="flat" rounded="lg" prepend-icon="mdi-trash-can-outline" class="btn-primary"
                        :loading="deleting" @click="handleDelete">
                        Sí, eliminar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </v-app>
</template>

<style scoped>
/* ── Base ─────────────────────────────────────────────────── */
.btn-primary {
    background-color: #b5451b !important;
    color: #f5f0e8 !important;
}

/* ── Plan card ──────────────────────────────────────────────── */
.plan-card {
    background-color: #2c1f0f !important;
    border: 1px solid #3d2f20;
    transition: transform 0.18s, box-shadow 0.18s;
    overflow: hidden;
}

.plan-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45) !important;
}

.plan-accent {
    height: 4px;
    background: linear-gradient(90deg, #e8c97a, #b5451b);
}

/* ── Precio ─────────────────────────────────────────────────── */
.price-label {
    font-size: 18px;
    font-weight: 700;
    color: #e8c97a;
    line-height: 1;
}

.price-amount {
    font-size: 2.4rem;
    font-weight: 800;
    color: #f5f0e8;
    line-height: 1.1;
    letter-spacing: -1px;
}

/* ── Métricas ───────────────────────────────────────────────── */
.metric-row {
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
}

/* ── Tabla resumen ──────────────────────────────────────────── */
.summary-card {
    background-color: #2c1f0f !important;
    border: 1px solid #3d2f20;
}

.summary-table {
    background: transparent !important;
}

.table-header {
    color: #c8b8a2 !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #3d2f20 !important;
    padding: 10px 16px !important;
    background: transparent !important;
}

.table-cell {
    border-bottom: 1px solid #3d2f2055 !important;
    padding: 10px 16px !important;
    background: transparent !important;
}

.table-row:hover .table-cell {
    background: rgba(232, 201, 122, 0.04) !important;
}

/* ── Diálogos ───────────────────────────────────────────────── */
.dialog-card {
    background-color: #2c1f0f !important;
}

.preview-card {
    background: rgba(232, 201, 122, 0.06) !important;
    border: 1px solid #3d2f20;
}
</style>